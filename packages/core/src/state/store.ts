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

function contentToText(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    if ("text" in value && typeof value.text === "string") {
      return value.text;
    }

    if ("id" in value && typeof value.id === "string") {
      return value.id;
    }
  }

  return "";
}

function viewportDimensions() {
  return {
    width: typeof window === "undefined" ? 1024 : window.innerWidth,
    height: typeof window === "undefined" ? 768 : window.innerHeight,
  };
}

function roundedRectPath(
  rect: DOMRect,
  viewport: { width: number; height: number },
  options: { padding?: number; radius?: number } = {},
) {
  const padding = options.padding ?? DEFAULT_OVERLAY_PADDING;
  const radius = options.radius ?? DEFAULT_OVERLAY_RADIUS;
  const x = Math.round(rect.left - padding);
  const y = Math.round(rect.top - padding);
  const width = Math.round(rect.width + padding * 2);
  const height = Math.round(rect.height + padding * 2);
  const right = x + width;
  const bottom = y + height;
  const corner = Math.max(0, Math.min(radius, width / 2, height / 2));

  return [
    `M0,0 H${Math.round(viewport.width)} V${Math.round(viewport.height)} H0 Z`,
    `M${x},${y + corner}`,
    `Q${x},${y} ${x + corner},${y}`,
    `H${right - corner}`,
    `Q${right},${y} ${right},${y + corner}`,
    `V${bottom - corner}`,
    `Q${right},${bottom} ${right - corner},${bottom}`,
    `H${x + corner}`,
    `Q${x},${bottom} ${x},${bottom - corner}`,
    "Z",
  ].join(" ");
}

function setStyle(element: HTMLElement | SVGElement, name: string, value: string) {
  if (typeof element.style.setProperty === "function") {
    element.style.setProperty(name, value);
    return;
  }

  (element.style as unknown as Record<string, string>)[name] = value;
}

function toggleElementAttribute(element: Element, name: string, enabled: boolean) {
  if (typeof element.toggleAttribute === "function") {
    element.toggleAttribute(name, enabled);
    return;
  }

  if (enabled) {
    element.setAttribute(name, "");
    return;
  }

  if (typeof element.removeAttribute === "function") {
    element.removeAttribute(name);
  }
}

export class TourStore {
  // readonly state = this;
  readonly status = new Observable<WorkflowStatus>("idle");

  readonly currentStepIndex = new Observable(-1);
  // readonly currentStep = new Observable<StepDefinition | null>(null);

  readonly direction = new Observable<WorkflowDirection>("next");

  // readonly canGoNext = new Observable(false);
  // readonly canGoPrevious = new Observable(false);
  // readonly canCancel = new Observable(true);
  // readonly isFirstStep = new Observable(false);
  // readonly isLastStep = new Observable(false);

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
      this.setWorkflow(workflow);
    }
    this.snapshot = new Observable<WorkflowState>(this.createSnapshot());
  }

  getWorkflow() {
    return this.workflow;
  }

  get() {
    return this.snapshot.get();
  }

  subscribe(listener: (state: WorkflowState) => void) {
    return this.snapshot.subscribe(listener);
  }

  registerElement(name: "popover" | "overlay", element: HTMLElement | SVGSVGElement | null) {
    this.elementListenerCleanups.get(name)?.();
    this.elementListenerCleanups.delete(name);

    const isPopover = name === "popover";

    if (element) {
      if (isPopover) {
        this.popover = new PopoverElement(element);
      } else {
        this.overlay = new OverlayElement(element);
      }
    } else {
      if (isPopover) {
        this.popover = null;
      } else {
        this.overlay = null;
      }
    }

    this.syncRegisteredElements();
  }

  // getElement(name: GlowTourElementName) {
  //   return this.elements.get(name) ?? null;
  // }

  async start(workflow = this.workflow) {
    if (!workflow) {
      throw new Error("Cannot start a tour without a workflow");
    }

    this.setWorkflow(workflow);
    this.error = null;
    this.setStatus("starting");
    workflow.options.onStart?.();

    if (this.steps.length === 0) {
      this.setStatus("finished");
      workflow.options.onFinish?.();
      return;
    }

    await this.goTo(0, "next");
  }

  async next() {
    const step = this.getCurrentWorkflowStep();
    if (!step) {
      return;
    }

    this.runTransitionAction(step.nextAction);
    const nextIndex = this.currentStepIndex.get() + 1;
    if (nextIndex >= this.steps.length) {
      this.detachListeners();
      this.setStatus("finished");
      this.workflow?.options.onFinish?.();
      return;
    }

    await this.goTo(nextIndex, "next");
  }

  async previous() {
    const step = this.getCurrentWorkflowStep();
    if (!step) {
      return;
    }

    this.runTransitionAction(step.previousAction);
    const previousIndex = this.currentStepIndex.get() - 1;
    if (previousIndex < 0) {
      await this.cancel();
      return;
    }

    await this.goTo(previousIndex, "previous");
  }

  async cancel() {
    if (!this.isCancellable()) {
      return;
    }

    const step = this.getCurrentWorkflowStep();
    if (step) {
      this.runTransitionAction(step.cancelAction);
    }

    this.detachListeners();
    this.currentStep.set(null);
    this.setStatus("cancelled");
    this.workflow?.options.onCancel?.();
  }

  async goTo(index: number, direction: WorkflowDirection = "next") {
    if (index < 0 || index >= this.steps.length) {
      throw new Error(`Step index ${index} is out of bounds`);
    }

    this.detachListeners();
    this.direction.set(direction);
    this.currentStepIndex.set(index);

    const step = this.steps[index]!;
    const target = await this.resolveTargetForStep(step.definition);
    if (!target) {
      return;
    }

    this.currentStep.set(step.definition);
    this.syncDerivedState();
    this.setStatus("running");
    this.attachListeners(step);
    await this.runActions(step.actions);
  }

  destroy() {
    this.detachListeners();
    this.detachElementListeners();
  }

  private setWorkflow(workflow: WorkflowDefinition) {
    this.workflow = workflow;
    this.steps.splice(
      0,
      this.steps.length,
      ...workflow.steps.map((step) => new WorkflowStep(step)),
    );
    this.currentStepIndex.set(-1);
    this.currentStep.set(null);
    this.syncDerivedState();
  }

  private async resolveTargetForStep(step: StepDefinition): Promise<HTMLElement | null> {
    const element = document.querySelector<HTMLElement>(step.target);
    if (element) {
      return element;
    }

    const strategy = step.behavior?.missingTargetStrategy ?? "error";
    if (strategy === "skip") {
      const nextIndex = this.currentStepIndex.get() + 1;
      if (nextIndex >= this.steps.length) {
        this.setStatus("finished");
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
    this.setStatus("error");
    return null;
  }

  private setStatus(status: WorkflowStatus) {
    this.status.set(status);
    this.syncDerivedState();
  }

  private syncDerivedState() {
    const index = this.currentStepIndex.get();
    const totalSteps = this.steps.length;

    this.canGoPrevious.set(index > 0);
    this.canGoNext.set(index >= 0 && index < totalSteps - 1);
    this.canCancel.set(this.isCancellable());
    this.isFirstStep.set(index === 0 && totalSteps > 0);
    this.isLastStep.set(index === totalSteps - 1 && totalSteps > 0);
    this.snapshot?.set(this.createSnapshot());
    this.syncRegisteredElements();
  }

  private createSnapshot(): WorkflowState {
    return {
      name: this.workflow?.name ?? "",
      totalSteps: this.steps.length,
      currentStepIndex: this.currentStepIndex.get(),
      currentStep: this.currentStep.get(),
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

  private getCurrentWorkflowStep() {
    const index = this.currentStepIndex.get();
    return index >= 0 ? (this.steps[index] ?? null) : null;
  }

  private isCancellable() {
    return this.workflow?.options.cancellable ?? true;
  }

  private runTransitionAction(action: StepTransitionAction | null) {
    if (!action) {
      return;
    }

    const step = this.getCurrentWorkflowStep();

    if (!step) {
      console.warn("No current step found for transition action");
      return;
    }
    action(step.getElement(), step.props);
  }

  private attachListeners(step: WorkflowStep) {
    this.listenerCleanups = step.eventHandlers.map((handler) => this.attachListener(step, handler));
  }

  //! pas bon à délégué à l'élément
  private attachElementListener(name: GlowTourElementName, element: Element) {
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

  private detachElementListeners() {
    for (const cleanup of this.elementListenerCleanups.values()) {
      cleanup();
    }
    this.elementListenerCleanups.clear();
  }

  private syncRegisteredElements() {
    const state = this.createSnapshot();
    const step = state.currentStep;
    const isRunning = state.status === "running" && !!step;

    this.syncElementState(this.elements.get("root"), state, step);
    this.syncPopover(isRunning, step);
    this.syncOverlay(isRunning, step);
    this.syncTriggers(state);
  }

  private syncElementState(
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

  private syncPopover(isRunning: boolean, step: StepDefinition | null) {
    const popover = this.elements.get("popover") as HTMLElement | undefined;
    const header = this.elements.get("header") as HTMLElement | undefined;
    const content = this.elements.get("content") as HTMLElement | undefined;

    if (!popover) {
      return;
    }

    this.syncElementState(popover, this.createSnapshot(), step);
    popover.hidden = !isRunning;
    if (!isRunning || !step) {
      return;
    }

    //! pas bon à délégué à l'élément
    if (header) {
      header.textContent = contentToText(step.presentation.title);
    }

    if (content) {
      content.textContent = contentToText(step.presentation.content);
    }

    const target = document.querySelector<HTMLElement>(step.target);
    if (!target || typeof target.getBoundingClientRect !== "function") {
      return;
    }

    const rect = target.getBoundingClientRect();
    const viewport = viewportDimensions();
    const gap = 14;
    const left = Math.max(16, Math.min(rect.left, viewport.width - DEFAULT_POPOVER_WIDTH - 16));
    const below = rect.bottom + gap;
    const top =
      below + DEFAULT_POPOVER_HEIGHT < viewport.height
        ? below
        : Math.max(16, rect.top - DEFAULT_POPOVER_HEIGHT - gap);

    //todo pas bon
    popover.style.position = "fixed";
    popover.style.left = `${Math.round(left)}px`;
    popover.style.top = `${Math.round(top)}px`;
  }

  private syncOverlay(isRunning: boolean, step: StepDefinition | null) {
    const overlay = this.elements.get("overlay") as SVGSVGElement | undefined;
    if (!overlay) {
      return;
    }

    this.syncElementState(overlay, this.createSnapshot(), step);
    toggleElementAttribute(overlay, "hidden", !isRunning);
    if (!isRunning || !step) {
      return;
    }

    if (
      typeof document.querySelector !== "function" ||
      typeof overlay.querySelector !== "function"
    ) {
      return;
    }

    const target = document.querySelector<HTMLElement>(step.target);
    const path = overlay.querySelector<SVGPathElement>("[data-glow-tour-overlay-path]");
    if (!target || !path || typeof target.getBoundingClientRect !== "function") {
      return;
    }

    const viewport = viewportDimensions();
    const overlayOptions = {
      padding: step.overlay?.padding ?? this.workflow?.options.overlay?.padding,
      radius: step.overlay?.radius ?? this.workflow?.options.overlay?.radius,
    };
    const rect = target.getBoundingClientRect();
    //!pas bon
    overlay.setAttribute(
      "viewBox",
      `0 0 ${Math.round(viewport.width)} ${Math.round(viewport.height)}`,
    );
    path.setAttribute("fill-rule", "evenodd");
    path.setAttribute(
      "fill",
      step.overlay?.color ?? this.workflow?.options.overlay?.color ?? DEFAULT_OVERLAY_COLOR,
    );
    path.setAttribute(
      "fill-opacity",
      String(
        step.overlay?.opacity ?? this.workflow?.options.overlay?.opacity ?? DEFAULT_OVERLAY_OPACITY,
      ),
    );
    path.setAttribute("d", roundedRectPath(rect, viewport, overlayOptions));
  }

  //todo pas bon
  private syncTriggers(state: WorkflowState) {
    const previous = this.elements.get("previous-trigger") as HTMLButtonElement | undefined;
    const next = this.elements.get("next-trigger") as HTMLButtonElement | undefined;

    if (previous) {
      this.syncElementState(previous, state, state.currentStep);
      previous.disabled = !state.canGoPrevious || state.status !== "running";
      previous.toggleAttribute("disabled", previous.disabled);
      previous.setAttribute("aria-disabled", String(previous.disabled));
    }

    if (next) {
      this.syncElementState(next, state, state.currentStep);
      next.disabled = state.status !== "running";
      next.toggleAttribute("disabled", next.disabled);
      next.setAttribute("aria-disabled", String(next.disabled));
    }
  }

  private attachListener(step: WorkflowStep, handler: EventHandler) {
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

  private detachListeners() {
    for (const cleanup of this.listenerCleanups) {
      cleanup();
    }
    this.listenerCleanups = [];
  }

  private async runActions(actions: StepActionInstruction[]) {
    for (const action of actions) {
      const activeStep = this.getCurrentWorkflowStep();
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
