import { Observable } from "@glowhop/observables";
import { WorkflowStep } from "../engine/workflow-step";
import type {
  EventHandler,
  GlowTourElementName,
  StepActionInstruction,
  StepDefinition,
  StepTransitionAction,
  WorkflowDefinition,
  WorkflowDirection,
  WorkflowState,
  WorkflowStatus,
} from "../types";
import OverlayElement from "../elements/overlay";
import PopoverElement from "../elements/popover";
import { isInViewport } from "../utils/utils";

const DEFAULT_TARGET_TIMEOUT = 3000;

function wait(timeMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, timeMs);
  });
}

type ListenerCleanup = () => void;

export class TourStore<T> {
  // readonly state = this;
  readonly status = new Observable<WorkflowStatus>("not-started");

  readonly currentStepIndex = new Observable(-1);

  readonly direction = new Observable<WorkflowDirection>("next");

  readonly snapshot: Observable<WorkflowState<T>>;

  workflow: WorkflowDefinition<T> | null = null;
  error: Error | null = null;

  readonly steps: WorkflowStep<T>[] = [];
  private listenerCleanups: ListenerCleanup[] = [];
  private popoverListenerCleanups: ListenerCleanup[] = [];
  private overlayListenerCleanups: ListenerCleanup[] = [];
  // private readonly elements = new Map<GlowTourElementName, Element>();
  private readonly elementListenerCleanups = new Map<GlowTourElementName, ListenerCleanup>();

  private overlay: OverlayElement<T> | null = null;
  private popover: PopoverElement<T> | null = null;

  constructor(workflow?: WorkflowDefinition<T>) {
    if (workflow) {
      this._setWorkflow(workflow);
    }
    this.snapshot = new Observable<WorkflowState<T>>(this._createSnapshot());
  }

  get() {
    return this.snapshot.get();
  }

  subscribe(listener: (state: WorkflowState<T>) => void) {
    return this.snapshot.subscribe(listener);
  }

  registerElementOverlay(element: SVGSVGElement | null) {
    if (element) {
      this.overlay = new OverlayElement<T>(element);
    } else {
      this.overlay = null;
    }

    this._syncOverlayStates();
  }

  registerElementPopover(element: HTMLElement | null) {
    if (element) {
      this.popover = new PopoverElement(element);
    } else {
      this.popover = null;
    }

    this._syncPopoverStates();
  }

  async start(workflow = this.workflow) {
    if (!workflow) {
      throw new Error("Cannot start a tour without a workflow");
    }

    this._setWorkflow(workflow);
    this.error = null;
    this._setStatus("starting");

    workflow.options.onStart?.();

    if (this.steps.length === 0) {
      this._setStatus("finished");
      workflow.options.onFinish?.();
      return;
    }

    await this.goTo(0, "next");
  }

  async next() {
    const step = this._getCurrentWorkflowStep();
    if (!step) {
      return;
    }

    if (step.nextAction) {
      this._runTransitionAction(step.nextAction);
    }

    const nextIndex = this.currentStepIndex.get() + 1;
    const isFinished = nextIndex >= this.steps.length;

    if (isFinished) {
      this._detachListeners();
      this._setStatus("finished");
      this.workflow?.options.onFinish?.();
      await this._disappearElements();
      return;
    }

    await this.goTo(nextIndex, "next");
  }

  async back() {
    const step = this._getCurrentWorkflowStep();
    if (!step) {
      return;
    }

    if (step.backAction) {
      this._runTransitionAction(step.backAction);
    }

    const backIndex = this.currentStepIndex.get() - 1;
    if (backIndex < 0) {
      await this.cancel();
      return;
    }

    await this.goTo(backIndex, "back");
  }

  async cancel() {
    if (!this._isCancellable()) {
      return;
    }

    const step = this._getCurrentWorkflowStep();
    if (step?.cancelAction) {
      this._runTransitionAction(step.cancelAction);
    }

    this._detachListeners();
    this._setStatus("cancelled");
    this.workflow?.options.onCancel?.();
    await this._disappearElements();
  }

  private async _scrollToTargetIfNeeded(target: HTMLElement, targetPosition: DOMRect) {
    const isIn = isInViewport(targetPosition);

    if (isIn) {
      return Promise.resolve();
    }

    const scrollOptions = this.workflow?.options.scroll;

    const behavior = scrollOptions?.behavior ?? "smooth";
    const block = scrollOptions?.block ?? "center";
    const inline = scrollOptions?.inline ?? "nearest";

    const promise = new Promise<void>((resolve) => {
      const onScroll = () => {
        window.removeEventListener("scroll", onScroll);
        resolve();
      };
      window.addEventListener("scroll", onScroll, { once: true });
    });

    target.scrollIntoView({ behavior, block, inline });

    return promise;
  }

  private async _disappearElements() {
    if (!this.overlay || !this.popover) {
      !this.overlay && console.warn("No overlay element registered");
      !this.popover && console.warn("No popover element registered");
      return;
    }
    await Promise.allSettled([this.overlay.disappear(), this.popover.disappear()]);
  }

  private async _movePopover(target: HTMLElement, step: StepDefinition<T>, appear: boolean) {
    const popover = this.popover;
    if (!popover) {
      console.warn("No popover element registered");
      return;
    }

    popover.moveToTarget(target.getBoundingClientRect(), step, appear, () => {
      this.snapshot.set(this._createSnapshot());
    });
  }

  private async _moveOverlay(target: HTMLElement, step: StepDefinition<T>) {
    const overlay = this.overlay;
    if (!overlay) {
      console.warn("No overlay element registered");
      return;
    }

    overlay.moveToTarget(target.getBoundingClientRect(), step);
  }

  async goTo(index: number, direction: WorkflowDirection = "next") {
    if (index < 0 || index >= this.steps.length) {
      throw new Error(`Step index ${index} is out of bounds`);
    }

    this._detachListeners();
    this.direction.set(direction);

    const step = this.steps[index];

    if (step.definition.presentation.resetPropsOnEnter) {
      step.reset();
    }

    const target = await this._resolveTargetForStep(step, index);
    if (!target) {
      console.warn(`Target element for step ${index} not found: ${step.definition.target}`);
      return;
    }
    this._scrollToTargetIfNeeded(target, target.getBoundingClientRect());
    this.currentStepIndex.set(index);
    this._setStatus("running");

    await Promise.allSettled([
      this._movePopover(target, step.definition, index === 0 && direction === "next"),
      this._moveOverlay(target, step.definition),
    ]);

    this._setStatus("idle");
    this._attachListeners(step);

    if (step.actions) {
      await this._runActions(step.actions);
    }
  }

  destroy() {
    this._detachListeners();
    this._detachElementListeners();
  }

  private _setWorkflow(workflow: WorkflowDefinition<T>) {
    this.workflow = workflow;
    this.steps.splice(
      0,
      this.steps.length,
      ...workflow.steps.map((step) => new WorkflowStep(step)),
    );
    this.currentStepIndex.set(-1);
    this._syncDerivedState();
  }

  private async _resolveTargetForStep(
    step: WorkflowStep<T>,
    index: number,
  ): Promise<HTMLElement | null> {
    await step.resolveTargetElement();
    const element = step.getElement();
    if (element) {
      return element;
    }
    const definition = step.definition;

    const strategy = definition.behavior?.missingTargetStrategy ?? "error";
    if (strategy === "skip") {
      const nextIndex = index + 1;
      if (nextIndex >= this.steps.length) {
        this._setStatus("finished");
        this.workflow?.options.onFinish?.();
      } else {
        await this.goTo(nextIndex, "next");
      }
      return null;
    }

    if (strategy === "wait") {
      const timeout = definition.behavior?.targetTimeout ?? DEFAULT_TARGET_TIMEOUT;
      const startedAt = Date.now();
      while (Date.now() - startedAt < timeout) {
        await wait(16);
        await step.resolveTargetElement();
        const nextElement = step.getElement();
        if (nextElement) {
          return nextElement;
        }
      }
    }

    this.error = new Error(`Missing target: ${step.definition.target}`);
    this._setStatus("error");
    return null;
  }

  private _setStatus(status: WorkflowStatus) {
    this.status.set(status);
    this._syncDerivedState();
  }

  private _syncDerivedState() {
    this._syncPopoverStates();
    this._syncOverlayStates();
  }

  private _createSnapshot(): WorkflowState<T> {
    return {
      name: this.workflow?.name ?? "",
      totalSteps: this.steps.length,
      startOptions: this.workflow?.options ?? {},
      currentStep: this._getCurrentWorkflowStep()?.getPublicProps() || null,
      currentStepIndex: this.currentStepIndex.get(),
      direction: this.direction.get(),
      status: this.status.get(),
      error: this.error,
      canCancel: this._isCancellable(),
      canGoNext: this._canGoNext(),
      canGoBack: this._canGoBack(),
      isFirstStep: this._isFirstStep(),
      isLastStep: this._isLastStep(),
    };
  }

  private _getCurrentWorkflowStep() {
    const index = this.currentStepIndex.get();
    return index >= 0 ? (this.steps[index] ?? null) : null;
  }

  private _isCancellable() {
    return this.workflow?.options.cancellable ?? true;
  }

  private _isFirstStep() {
    return this.currentStepIndex.get() === 0;
  }

  private _isLastStep() {
    return this.currentStepIndex.get() === this.steps.length - 1;
  }

  private _canGoNext() {
    return this.currentStepIndex.get() <= this.steps.length - 1;
  }

  private _canGoBack() {
    return this.currentStepIndex.get() > 0;
  }

  private _runTransitionAction(action: StepTransitionAction<T> | null) {
    if (!action) {
      return;
    }

    const step = this._getCurrentWorkflowStep();

    if (!step) {
      console.warn("No current step found for transition action");
      return;
    }
    action(step.getElement(), step.props);
  }

  private _attachListeners(step: WorkflowStep<T>) {
    if (step.eventHandlers) {
      //! update on resize, scroll, etc
      this.listenerCleanups = step.eventHandlers.map((handler) =>
        this._attachListener(step, handler),
      );
    }

    this._attachKeyboardShortcuts();
  }

  private _attachKeyboardShortcuts() {
    const nextKeyshortcuts = this.workflow?.options.popover?.keyboardShortcuts?.next ?? [
      "Enter",
      "ArrowRight",
    ];
    const backKeyshortcuts = this.workflow?.options.popover?.keyboardShortcuts?.back ?? [
      "ArrowLeft",
      "Backspace",
    ];
    const cancelKeyshortcuts = this.workflow?.options.popover?.keyboardShortcuts?.cancel ?? [
      "Escape",
    ];

    const nextKeyshortcutsStr = nextKeyshortcuts.join(" ");
    const backKeyshortcutsStr = backKeyshortcuts.join(" ");

    const nextButton = document.querySelector<HTMLButtonElement>("[data-glow-tour-next-trigger]");
    if (nextButton && nextKeyshortcutsStr.length) {
      nextButton.setAttribute("aria-keyshortcuts", nextKeyshortcutsStr);
    }
    const backButton = document.querySelector<HTMLButtonElement>("[data-glow-tour-back-trigger]");
    if (backButton && backKeyshortcutsStr.length) {
      backButton.setAttribute("aria-keyshortcuts", backKeyshortcutsStr);
    }

    const keydownHandler: EventHandler<T, KeyboardEvent> = {
      event: "keydown",
      callback: async (event) => {
        if (nextKeyshortcuts.includes(event.key) && this._canGoNext()) {
          event.preventDefault();
          nextButton?.focus();
          await this.next();
        } else if (backKeyshortcuts.includes(event.key) && this._canGoBack()) {
          event.preventDefault();
          backButton?.focus();
          await this.back();
        } else if (cancelKeyshortcuts.includes(event.key) && this._isCancellable()) {
          event.preventDefault();
          await this.cancel();
        }
      },
    };

    window.addEventListener(keydownHandler.event, keydownHandler.callback as EventListener);

    this.listenerCleanups.push(() =>
      window.removeEventListener(keydownHandler.event, keydownHandler.callback as EventListener),
    );
  }

  private _detachElementListeners() {
    for (const cleanup of this.elementListenerCleanups.values()) {
      cleanup();
    }
    this.elementListenerCleanups.clear();
  }

  private _isRunning() {
    const status = this.status.get();
    return (
      status !== "not-started" &&
      status !== "finished" &&
      status !== "cancelled" &&
      status !== "error"
    );
  }

  private _syncPopoverStates() {
    for (const cleanup of this.popoverListenerCleanups) {
      cleanup();
    }
    this.popoverListenerCleanups = [];

    const state = this._createSnapshot();
    if (!this.popover) {
      console.warn("No popover element registered");
      return;
    }

    const popover = this.popover.getElement();
    if (!popover) {
      !popover && console.warn("No popover element found");
      return;
    }

    const isRunning = this._isRunning();
    const animated = this.workflow?.options?.animated ?? true;

    if (!isRunning) {
      this.popover.initializeProps();
    }
    popover.setAttribute("data-glow-tour-status", state.status);
    popover.setAttribute("data-glow-tour-step-index", String(state.currentStepIndex));
    popover.setAttribute("data-glow-tour-animated", String(animated));
    popover.setAttribute("data-glow-tour-direction", state.direction);
    popover.setAttribute("data-glow-tour-last-step", String(state.isLastStep));

    this.popover.setAnimationOptions({
      duration: this.workflow?.options.animation?.duration,
      easing: this.workflow?.options.animation?.easing,
    });

    const isIdle = this.status.get() === "idle";
    if (isIdle) {
      const update = async () => {
        if (!this.popover) return;
        const step = this._getCurrentWorkflowStep();
        if (!step) return;
        const index = this.currentStepIndex.get();
        const target = await this._resolveTargetForStep(step, index);
        if (!target) return;
        this.popover.updatePosition(target.getBoundingClientRect(), step.definition);
      };
      const timeout = setInterval(update, 500);
      this.popoverListenerCleanups.push(() => {
        clearInterval(timeout);
      });
    }
  }

  private _syncOverlayStates() {
    for (const cleanup of this.overlayListenerCleanups) {
      cleanup();
    }
    this.overlayListenerCleanups = [];

    const state = this._createSnapshot();
    if (!this.overlay) {
      console.warn("No overlay element registered");
      return;
    }

    const overlay = this.overlay.getElement();
    if (!overlay) {
      !overlay && console.warn("No overlay element found");
      return;
    }

    const isRunning = this._isRunning();
    const animated = this.workflow?.options?.animated ?? true;

    if (!isRunning) {
      this.overlay.initializeProps();
    }

    overlay.setAttribute("data-glow-tour-direction", state.direction);
    overlay.setAttribute("data-glow-tour-status", state.status);
    overlay.setAttribute("data-glow-tour-step-index", String(state.currentStepIndex));
    overlay.setAttribute("data-glow-tour-animated", String(animated));

    this.overlay.setAnimationOptions({
      duration: this.workflow?.options.animation?.duration,
      easing: this.workflow?.options.animation?.easing,
    });

    const isIdle = this.status.get() === "idle";
    if (isIdle) {
      let stop = false;
      const update = async () => {
        if (stop) return;
        if (!this.overlay) return;
        const step = this._getCurrentWorkflowStep();
        if (!step) return;
        const index = this.currentStepIndex.get();
        const target = await this._resolveTargetForStep(step, index);
        if (!target) return;
        this.overlay.updatePosition(target.getBoundingClientRect(), step.definition);
        requestAnimationFrame(update);
      };
      requestAnimationFrame(update);
      this.overlayListenerCleanups.push(() => {
        stop = true;
      });
    }
  }

  private _attachListener(step: WorkflowStep<T>, handler: EventHandler<T>) {
    const target = step.getElement() ?? document;
    const listener: EventListener = async (event) => {
      await handler.callback(
        event,
        step.props,
        () => this.next(),
        () => this.back(),
        () => this.cancel(),
      );
    };

    target.addEventListener(handler.event, listener);
    return () => {
      target.removeEventListener(handler.event, listener);
    };
  }

  private _detachListeners() {
    for (const cleanup of this.listenerCleanups) {
      cleanup();
    }
    this.listenerCleanups = [];
  }

  private async _runActions(actions: StepActionInstruction<T>[]) {
    for (const action of actions) {
      const activeStep = this._getCurrentWorkflowStep();
      if (!activeStep) {
        return;
      }

      if (typeof action === "number") {
        await wait(action);
        continue;
      }

      if (action === "next") {
        await this.next();
        return;
      }

      if (action === "back") {
        await this.back();
        return;
      }

      const result = await action(activeStep.getElement(), activeStep.props);
      if (result === false) {
        return;
      }
    }
  }
}

export function createTourStore<T>(workflow?: WorkflowDefinition<T>) {
  return new TourStore(workflow);
}
