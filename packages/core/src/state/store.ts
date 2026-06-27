import { Observable } from "@glowhop/observables";
import { WorkflowStep } from "../engine/workflow-step";
import type {
  EventHandler,
  GlowTourElementName,
  StepActionInstruction,
  StepDefinition,
  StepPresentation,
  StepTransitionAction,
  WorkflowDefinition,
  WorkflowDirection,
  WorkflowState,
  WorkflowStatus,
} from "../types";
import OverlayElement from "../elements/overlay";
import PopoverElement from "../elements/popover";

const DEFAULT_TARGET_TIMEOUT = 3000;
const DEFAULT_POPOVER_WIDTH = 320;
const DEFAULT_POPOVER_HEIGHT = 180;
const DEFAULT_OVERLAY_PADDING = 16;
const DEFAULT_OVERLAY_RADIUS = 12;
const DEFAULT_OVERLAY_COLOR = "#000000";
const DEFAULT_OVERLAY_OPACITY = 0.6;
const DEFAULT_ANIMATION_DURATION = 180;
const DEFAULT_ANIMATION_EASING = "ease-out";

function wait(timeMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, timeMs);
  });
}

type ListenerCleanup = () => void;

export class TourStore {
  // readonly state = this;
  readonly status = new Observable<WorkflowStatus>("not-started");

  readonly currentStepIndex = new Observable(-1);

  readonly direction = new Observable<WorkflowDirection>("next");

  readonly canGoNext = new Observable(false);
  readonly canGoPrevious = new Observable(false);
  readonly canCancel = new Observable(true);
  readonly isFirstStep = new Observable(false);
  readonly isLastStep = new Observable(false);

  readonly snapshot: Observable<WorkflowState>;

  workflow: WorkflowDefinition | null = null;
  error: Error | null = null;

  readonly steps: WorkflowStep[] = [];
  private listenerCleanups: ListenerCleanup[] = [];
  // private readonly elements = new Map<GlowTourElementName, Element>();
  private readonly elementListenerCleanups = new Map<GlowTourElementName, ListenerCleanup>();

  private overlay: OverlayElement | null = null;
  private popover: PopoverElement | null = null;

  constructor(workflow?: WorkflowDefinition) {
    if (workflow) {
      this._setWorkflow(workflow);
    }
    this.snapshot = new Observable<WorkflowState>(this._createSnapshot());
  }

  // getWorkflow() {
  //   return this.workflow;
  // }

  get() {
    return this.snapshot.get();
  }

  subscribe(listener: (state: WorkflowState) => void) {
    return this.snapshot.subscribe(listener);
  }

  registerElementOverlay(element: SVGSVGElement | null) {
    // this.elementListenerCleanups.get(name)?.();
    // this.elementListenerCleanups.delete(name);

    if (element) {
      this.overlay = new OverlayElement(element);
    } else {
      this.overlay = null;
    }

    this._syncRegisteredElements();
  }

  registerElementPopover(element: HTMLElement | null) {
    // this.elementListenerCleanups.get(name)?.();
    // this.elementListenerCleanups.delete(name);

    if (element) {
      this.popover = new PopoverElement(element);
    } else {
      this.popover = null;
    }

    this._syncRegisteredElements();
  }

  private async _appearElements() {
    if (!this.overlay || !this.popover) {
      !this.overlay && console.warn("No overlay element registered");
      !this.popover && console.warn("No popover element registered");
      return;
    }

    const step = this._getCurrentWorkflowStep();
    if (!step) {
      console.warn("No current step found for appearElements");
      return;
    }
    const target = await this._resolveTargetForStep(step.definition);
    if (!target) {
      console.warn("No target element found for appearElements");
      return;
    }
    const targetPosition = target.getBoundingClientRect();

    return Promise.allSettled([
      this.overlay.show(targetPosition, step.definition),
      this.popover.show(targetPosition, step.definition),
    ]);
  }

  private _disappearElements() {
    if (!this.overlay || !this.popover) {
      !this.overlay && console.warn("No overlay element registered");
      !this.popover && console.warn("No popover element registered");
      return;
    }
    return Promise.allSettled([this.overlay.hide(), this.popover.hide()]);
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

    await this._disappearElements();
    await this.goTo(0, "next");
  }

  async next() {
    const step = this._getCurrentWorkflowStep();
    if (!step) {
      return;
    }

    this._runTransitionAction(step.nextAction);

    const nextIndex = this.currentStepIndex.get() + 1;
    if (nextIndex >= this.steps.length) {
      this._detachListeners();
      this._setStatus("finished");
      this.workflow?.options.onFinish?.();
      await this._disappearElements();
      return;
    }

    await this.goTo(nextIndex, "next");
  }

  async previous() {
    const step = this._getCurrentWorkflowStep();
    if (!step) {
      return;
    }

    this._runTransitionAction(step.previousAction);
    const previousIndex = this.currentStepIndex.get() - 1;
    if (previousIndex < 0) {
      await this.cancel();
      return;
    }

    await this.goTo(previousIndex, "previous");
  }

  async cancel() {
    if (!this._isCancellable()) {
      return;
    }

    const step = this._getCurrentWorkflowStep();
    if (step) {
      this._runTransitionAction(step.cancelAction);
    }

    this._detachListeners();
    this._setStatus("cancelled");
    this.workflow?.options.onCancel?.();
    await this._disappearElements();
  }

  private async _movePopover(target: HTMLElement, step: StepDefinition) {
    const popover = this.popover;
    if (!popover) {
      console.warn("No popover element registered");
      return;
    }
    if (!popover.isShown()) {
      console.warn("popover not shown");
    }

    popover.moveToTarget(target.getBoundingClientRect(), step);
  }

  private async _moveOverlay(target: HTMLElement, step: StepDefinition) {
    const overlay = this.overlay;
    if (!overlay) {
      console.warn("No overlay element registered");
      return;
    }
    if (!overlay.isShown()) {
      console.warn("overlay not shown");
    }
    overlay.moveToTarget(target.getBoundingClientRect(), step);
  }

  async goTo(index: number, direction: WorkflowDirection = "next") {
    if (index < 0 || index >= this.steps.length) {
      throw new Error(`Step index ${index} is out of bounds`);
    }

    this._detachListeners();
    this.direction.set(direction);
    this.currentStepIndex.set(index);

    const step = this.steps[index];
    const target = await this._resolveTargetForStep(step.definition);
    if (!target) {
      console.warn(`Target element for step ${index} not found: ${step.definition.target}`);
      return;
    }

    this._setStatus("running");

    await Promise.allSettled([
      this._movePopover(target, step.definition),
      this._moveOverlay(target, step.definition),
    ]);

    this._setStatus("idle");

    this._syncDerivedState();
    this._attachListeners(step);

    await this._runActions(step.actions);
  }

  destroy() {
    this._detachListeners();
    this._detachElementListeners();
  }

  private _setWorkflow(workflow: WorkflowDefinition) {
    this.workflow = workflow;
    this.steps.splice(
      0,
      this.steps.length,
      ...workflow.steps.map((step) => new WorkflowStep(step)),
    );
    this.currentStepIndex.set(-1);
    this._syncDerivedState();
  }

  private async _resolveTargetForStep(step: StepDefinition): Promise<HTMLElement | null> {
    const element = document.querySelector<HTMLElement>(step.target);
    if (element) {
      return element;
    }

    const strategy = step.behavior?.missingTargetStrategy ?? "error";
    if (strategy === "skip") {
      const nextIndex = this.currentStepIndex.get() + 1;
      if (nextIndex >= this.steps.length) {
        this._setStatus("finished");
        this.workflow?.options.onFinish?.();
      } else {
        await this.goTo(nextIndex, "next");
      }
      return null;
    }

    if (strategy === "wait") {
      const timeout = step.behavior?.targetTimeout ?? DEFAULT_TARGET_TIMEOUT;
      const startedAt = Date.now();
      while (Date.now() - startedAt < timeout) {
        await wait(16);
        const nextElement = document.querySelector<HTMLElement>(step.target);
        if (nextElement) {
          return nextElement;
        }
      }
    }

    this.error = new Error(`Missing target: ${step.target}`);
    this._setStatus("error");
    return null;
  }

  private _setStatus(status: WorkflowStatus) {
    this.status.set(status);
    this._syncDerivedState();
  }

  private _syncDerivedState() {
    const index = this.currentStepIndex.get();
    const totalSteps = this.steps.length;

    this.canGoPrevious.set(index > 0);
    this.canGoNext.set(index >= 0 && index < totalSteps - 1);
    this.canCancel.set(this._isCancellable());
    this.isFirstStep.set(index === 0 && totalSteps > 0);
    this.isLastStep.set(index === totalSteps - 1 && totalSteps > 0);
    this.snapshot?.set(this._createSnapshot());
    this._syncRegisteredElements();
  }

  private _createSnapshot(): WorkflowState {
    return {
      name: this.workflow?.name ?? "",
      totalSteps: this.steps.length,
      currentStepIndex: this.currentStepIndex.get(),
      direction: this.direction.get(),
      canGoNext: this.canGoNext.get(),
      canGoPrevious: this.canGoPrevious.get(),
      canCancel: this.canCancel.get(),
      isFirstStep: this.isFirstStep.get(),
      isLastStep: this.isLastStep.get(),
      status: this.status.get(),
      workflow: this.workflow,
      error: this.error,
    };
  }

  private _getCurrentWorkflowStep() {
    const index = this.currentStepIndex.get();
    return index >= 0 ? (this.steps[index] ?? null) : null;
  }

  private _isCancellable() {
    return this.workflow?.options.cancellable ?? true;
  }

  private _runTransitionAction(action: StepTransitionAction | null) {
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

  private _attachListeners(step: WorkflowStep) {
    //! update on resize, scroll, etc
    this.listenerCleanups = step.eventHandlers.map((handler) =>
      this._attachListener(step, handler),
    );
  }

  //! pas bon à délégué à l'élément
  private attachElementListener() {
    if (name !== "previous-trigger" && name !== "next-trigger") {
      return;
    }

    const listener = () => {
      if (element.hasAttribute("disabled")) {
        return;
      }

      if (name === "previous-trigger") {
        void this.previous();
        return;
      }

      void this.next();
    };

    element.addEventListener("click", listener);
    this.elementListenerCleanups.set(name, () => element.removeEventListener("click", listener));
  }

  private _detachElementListeners() {
    for (const cleanup of this.elementListenerCleanups.values()) {
      cleanup();
    }
    this.elementListenerCleanups.clear();
  }

  private _syncRegisteredElements() {
    const state = this._createSnapshot();
    const step = state.currentStep;
    const isRunning = state.status === "running" && !!step;

    this._syncElementState(this.elements.get("root"), state, step);
    // this._syncPopover(isRunning, step);
    // this._syncOverlay(isRunning, step);
    this._syncTriggers(state);
  }

  private _syncElementState(
    element: Element | undefined,
    state: WorkflowState,
    step: StepDefinition | null,
  ) {
    if (!element) {
      return;
    }

    const animated = step?.presentation.animated ?? this.workflow?.options.step?.animated ?? true;
    const animation = step?.animation ?? this.workflow?.options.animation;

    element.setAttribute("data-glow-tour-status", state.status);
    element.setAttribute("data-glow-tour-direction", state.direction);
    element.setAttribute("data-glow-tour-step-index", String(state.currentStepIndex));

    toggleElementAttribute(element, "data-glow-tour-last-step", state.isLastStep);
    toggleElementAttribute(element, "data-glow-tour-animated", animated);

    const isHtmlElement = typeof HTMLElement !== "undefined" && element instanceof HTMLElement;
    const isSvgElement = typeof SVGElement !== "undefined" && element instanceof SVGElement;

    if (isHtmlElement || isSvgElement) {
      setStyle(
        element,
        "--glow-tour-animation-duration",
        `${animation?.duration ?? DEFAULT_ANIMATION_DURATION}ms`,
      );
      setStyle(
        element,
        "--glow-tour-animation-easing",
        animation?.easing ?? DEFAULT_ANIMATION_EASING,
      );
    }
  }

  //todo pas bon
  private _syncTriggers(state: WorkflowState) {
    const previous = this.elements.get("previous-trigger") as HTMLButtonElement | undefined;
    const next = this.elements.get("next-trigger") as HTMLButtonElement | undefined;

    if (previous) {
      this._syncElementState(previous, state, state.currentStep);
      previous.disabled = !state.canGoPrevious || state.status !== "running";
      previous.toggleAttribute("disabled", previous.disabled);
      previous.setAttribute("aria-disabled", String(previous.disabled));
    }

    if (next) {
      this._syncElementState(next, state, state.currentStep);
      next.disabled = state.status !== "running";
      next.toggleAttribute("disabled", next.disabled);
      next.setAttribute("aria-disabled", String(next.disabled));
    }
  }

  private _attachListener(step: WorkflowStep, handler: EventHandler) {
    const target = step.getElement() ?? document;
    const listener: EventListener = async (event) => {
      await handler.callback(
        event,
        step.props,
        () => this.next(),
        () => this.previous(),
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

  private async _runActions(actions: StepActionInstruction[]) {
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

      if (action === "prev") {
        await this.previous();
        return;
      }

      const result = await action(activeStep.getElement(), activeStep.props);
      if (result === false) {
        return;
      }
    }
  }
}

export function createTourStore(workflow?: WorkflowDefinition) {
  return new TourStore(workflow);
}
