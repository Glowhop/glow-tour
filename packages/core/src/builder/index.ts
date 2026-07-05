import type {
  AnimationOptions,
  EventHandler,
  OverlayOptions,
  PopoverOptions,
  ScrollOptions,
  StartOptions,
  StepAction,
  StepActionInstruction,
  StepBehavior,
  StepDefinition,
  StepPresentation,
  StepTransitionAction,
  TargetResolver,
  WorkflowDefinition,
} from "../types";

export interface StepConstructor<T> extends StepPresentation<T> {
  target: TargetResolver;
  overlay?: OverlayOptions;
  popover?: PopoverOptions;
  scroll?: ScrollOptions;
  animation?: AnimationOptions;
  behavior?: StepBehavior;
}

function cloneStepDefinition<T>(step: StepDefinition<T>): StepDefinition<T> {
  return {
    ...step,
    presentation: {
      ...step.presentation,
      data: step.presentation.data ? { ...step.presentation.data } : undefined,
    },
    overlay: step.overlay ? { ...step.overlay } : undefined,
    popover: step.popover ? { ...step.popover } : undefined,
    // scroll: step.scroll ? { ...step.scroll } : undefined,
    // animation: step.animation ? { ...step.animation } : undefined,
    behavior: step.behavior ? { ...step.behavior } : undefined,
    actions: [...step.actions],
    eventHandlers: [...step.eventHandlers],
  };
}

function cloneStartOptions(options: StartOptions): StartOptions {
  return {
    ...options,
    overlay: options.overlay ? { ...options.overlay } : undefined,
    popover: options.popover ? { ...options.popover } : undefined,
    // step: options.step
    //   ? {
    //       ...options.step,
    //       data: options.step.data ? { ...options.step.data } : undefined,
    //     }
    //   : undefined,
    scroll: options.scroll ? { ...options.scroll } : undefined,
    animation: options.animation ? { ...options.animation } : undefined,
    behavior: options.behavior ? { ...options.behavior } : undefined,
  };
}

export class Builder<T> {
  private steps: StepDefinition<T>[] = [];
  private currentStep: StepBuilder<T> | null = null;

  constructor(
    public readonly name: string,
    private readonly options: StartOptions = {},
  ) {}

  step(options: StepConstructor<T>) {
    if (this.currentStep) {
      this.steps.push(this.currentStep.toDefinition());
    }

    this.currentStep = new StepBuilder(this, {
      target: options.target,
      presentation: {
        title: options.title,
        content: options.content,
        hideFooter: options.hideFooter ?? this.options.step?.hideFooter,
        hideBackButton: options.hideBackButton ?? this.options.step?.hideBackButton,
        hideNextButton: options.hideNextButton ?? this.options.step?.hideNextButton,
        // animated: options.animated ?? this.options.step?.animated,
        data: options.data ?? this.options.step?.data,
      },
      overlay: options.overlay ?? this.options.overlay,
      popover: options.popover ?? this.options.popover,
      // scroll: options.scroll ?? this.options.scroll,
      // animation: options.animation ?? this.options.animation,
      behavior: options.behavior ?? this.options.behavior,
      actions: [],
      eventHandlers: [],
      nextAction: null,
      previousAction: null,
      cancelAction: null,
    });

    return this.currentStep;
  }

  concat(builder: StepBuilder<T>) {
    const definition = builder.builder.finish();
    const steps = definition.steps.map((step) => cloneStepDefinition(step));

    if (steps.length === 0) {
      throw new Error("Cannot concat a builder without steps");
    }

    if (this.currentStep) {
      this.steps.push(this.currentStep.toDefinition());
    }

    this.steps.push(...steps.slice(0, -1));
    this.currentStep = new StepBuilder(this, steps[steps.length - 1]!);
    return this.currentStep;
  }

  finish(): WorkflowDefinition<T> {
    const finalizedSteps = this.currentStep
      ? [...this.steps, this.currentStep.toDefinition()]
      : [...this.steps];

    return {
      name: this.name,
      options: cloneStartOptions(this.options),
      steps: finalizedSteps.map((step) => cloneStepDefinition(step)),
    };
  }
}

export class StepBuilder<T> {
  readonly actions: StepActionInstruction[];
  readonly eventHandlers: EventHandler[];
  nextAction: StepTransitionAction | null;
  previousAction: StepTransitionAction | null;
  cancelAction: StepTransitionAction | null;

  constructor(
    public readonly builder: Builder<T>,
    private definition: StepDefinition<T>,
  ) {
    this.actions = this.definition.actions;
    this.eventHandlers = this.definition.eventHandlers;
    this.nextAction = this.definition.nextAction;
    this.previousAction = this.definition.previousAction;
    this.cancelAction = this.definition.cancelAction;
  }

  step(options: StepConstructor<T>) {
    return this.builder.step(options);
  }

  finish() {
    return this.builder.finish();
  }

  concat(builder: StepBuilder<T>) {
    return this.builder.concat(builder);
  }

  clickTarget() {
    this.actions.push(async (target) => {
      target?.click();
      return true;
    });
    return this;
  }

  focusTarget() {
    this.actions.push(async (target) => {
      target?.focus();
      return true;
    });
    return this;
  }

  wait(timeMs: number) {
    this.actions.push(timeMs);
    return this;
  }

  waitFor(callback: (target: HTMLElement | null) => Promise<boolean> | boolean) {
    this.actions.push(async (target) => callback(target));
    return this;
  }

  alter(callback: StepAction) {
    this.actions.push(callback);
    return this;
  }

  waitForElement(target: string) {
    this.actions.push(async () => !!document.querySelector(target));
    return this;
  }

  next() {
    this.actions.push("next");
    return this;
  }

  prev() {
    this.actions.push("prev");
    return this;
  }

  exec(callback: (target: HTMLElement | null) => Promise<void> | void) {
    this.actions.push(async (target) => {
      await callback(target);
      return true;
    });
    return this;
  }

  action(callback: StepAction) {
    this.actions.push(callback);
    return this;
  }

  onNext(callback: StepTransitionAction) {
    this.nextAction = callback;
    this.definition.nextAction = callback;
    return this;
  }

  onPrevious(callback: StepTransitionAction) {
    this.previousAction = callback;
    this.definition.previousAction = callback;
    return this;
  }

  onCancel(callback: StepTransitionAction) {
    this.cancelAction = callback;
    this.definition.cancelAction = callback;
    return this;
  }

  onEvent(event: string, callback: EventHandler["callback"]) {
    this.eventHandlers.push({ event, callback });
    return this;
  }

  on(event: string, callback: EventHandler["callback"]) {
    return this.onEvent(event, callback);
  }

  toDefinition(): StepDefinition<unknown> {
    return {
      ...this.definition,
      presentation: {
        ...this.definition.presentation,
        data: this.definition.presentation.data
          ? { ...this.definition.presentation.data }
          : undefined,
      },
      overlay: this.definition.overlay ? { ...this.definition.overlay } : undefined,
      popover: this.definition.popover ? { ...this.definition.popover } : undefined,
      // scroll: this.definition.scroll ? { ...this.definition.scroll } : undefined,
      // animation: this.definition.animation ? { ...this.definition.animation } : undefined,
      behavior: this.definition.behavior ? { ...this.definition.behavior } : undefined,
      actions: [...this.actions],
      eventHandlers: [...this.eventHandlers],
      nextAction: this.nextAction,
      previousAction: this.previousAction,
      cancelAction: this.cancelAction,
    };
  }
}

export function create<T>(name: string, options: StartOptions = {}) {
  return new Builder<T>(name, options);
}
