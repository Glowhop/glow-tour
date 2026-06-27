import type { Observable } from "@glowhop/observables";
import type { ContentValue, PrimitiveValue } from "../content";

export type TargetResolver = string;

export type WorkflowStatus =
  | "not-started"
  | "idle"
  | "starting"
  | "running"
  | "paused"
  | "finished"
  | "cancelled"
  | "error";

export type WorkflowDirection = "next" | "previous";
export type GlowTourElementName =
  | "root"
  | "header"
  | "progress"
  | "content"
  | "footer"
  | "popover"
  | "previous-trigger"
  | "next-trigger"
  | "overlay";

export interface ViewportDimensions {
  width: number;
  height: number;
}

export interface HighlightOptions {
  padding: number;
  radius: number;
  overlayColor: string;
  overlayOpacity: number;
  animate: boolean;
}

export interface HighlightStepOverrides extends Partial<HighlightOptions> {}

export interface WorkflowHighlightOptions extends Partial<HighlightOptions> {
  mountRoot?: HTMLElement | null;
}

export interface StepBehavior {
  allowInteraction?: boolean;
  missingTargetStrategy?: "wait" | "skip" | "error";
  targetTimeout?: number;
  autoNext?: boolean;
}

export type TryOrderOptions = "top" | "bottom" | "left" | "right";

export interface OverlayOptions {
  color?: string;
  opacity?: number;
  padding?: number;
  radius?: number;
  disableInteractionIndicator?: boolean;
  interactionIndicatorPlacementTryOrder?: TryOrderOptions[];
}

export interface PopoverOptions {
  placementTryOrder?: TryOrderOptions[];
  disableArrow?: boolean;
  disableAnimation?: boolean;
  disableAutoFocus?: boolean;
  disableAutoScroll?: boolean;
  disableAutoPlacement?: boolean;
  hideProgressIndicator?: boolean;
  gap?: number;
}

export interface StepPresentation {
  title: ContentValue;
  content: ContentValue;
  hideFooter?: boolean;
  hideBackButton?: boolean;
  hideNextButton?: boolean;
  data?: Record<string, PrimitiveValue>;
}

export interface ScrollOptions {
  behavior?: "auto" | "smooth";
  block?: "start" | "center" | "end" | "nearest";
  inline?: "start" | "center" | "end" | "nearest";
}

export interface AnimationOptions {
  duration: number;
  easing: string;
}

export interface StartOptions {
  cancellable?: boolean;
  overlay?: OverlayOptions;
  popover?: PopoverOptions;
  animated?: boolean;
  scroll?: ScrollOptions;
  animation?: AnimationOptions;
  behavior?: StepBehavior;
  buttons?: {
    previousLabel?: string;
    nextLabel?: string;
    cancelLabel?: string;
    finishLabel?: string;
  };
  onStart?: () => void;
  onCancel?: () => void;
  onFinish?: () => void;
}

export type StepPropsStore = Observable<StepPresentation>;
export type StepActionResult = boolean | void;

export type StepAction = (
  element: HTMLElement | null,
  stepProps: StepPropsStore,
) => Promise<StepActionResult> | StepActionResult;
export type StepActionInstruction = StepAction | number | "prev" | "next";
export type StepTransitionAction = (element: HTMLElement | null, stepProps: StepPropsStore) => void;

export interface EventHandler<TEvent extends Event = Event> {
  event: string;
  callback: (
    event: TEvent,
    stepProps: StepPropsStore,
    next: () => Promise<void>,
    previous: () => Promise<void>,
    cancel: () => Promise<void>,
  ) => void | Promise<void>;
}

export interface StepDefinition {
  target: TargetResolver;
  presentation: StepPresentation;
  overlay?: OverlayOptions;
  popover?: PopoverOptions;
  scroll?: ScrollOptions;
  animation?: AnimationOptions;
  behavior?: StepBehavior;
  actions: StepActionInstruction[];
  eventHandlers: EventHandler[];
  nextAction: StepTransitionAction | null;
  previousAction: StepTransitionAction | null;
  cancelAction: StepTransitionAction | null;
}

export interface WorkflowDefinition {
  name: string;
  options: StartOptions;
  steps: StepDefinition[];
}

export interface WorkflowState {
  name: string;
  totalSteps: number;
  currentStepIndex: number;
  currentStep: StepDefinition | null;
  direction: WorkflowDirection;
  canGoNext: boolean;
  canGoPrevious: boolean;
  canCancel: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
  status: WorkflowStatus;
  startOptions: StartOptions;
  error: Error | null;
}

export interface WorkflowControls {
  start: (workflow?: WorkflowDefinition) => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  cancel: () => Promise<void>;
  goTo: (index: number) => Promise<void>;
}
