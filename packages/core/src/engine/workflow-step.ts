import { Observable } from "@glowhop/observables";
import type { StepDefinition, StepPresentation } from "../types";
import { resolveTargetElement } from "../utils/utils";

export class WorkflowStep<T> {
  readonly target: StepDefinition<T>["target"];
  readonly actions: StepDefinition<T>["actions"];
  readonly eventHandlers: StepDefinition<T>["eventHandlers"];
  readonly nextAction: StepDefinition<T>["nextAction"];
  readonly previousAction: StepDefinition<T>["previousAction"];
  readonly cancelAction: StepDefinition<T>["cancelAction"];
  readonly props: Observable<StepDefinition<T>["presentation"]>;
  readonly initialProps: Readonly<StepDefinition<T>["presentation"]>;

  constructor(readonly definition: StepDefinition<T>) {
    this.target = definition.target;
    this.actions = [...definition.actions];
    this.eventHandlers = [...definition.eventHandlers];
    this.nextAction = definition.nextAction;
    this.previousAction = definition.previousAction;
    this.cancelAction = definition.cancelAction;
    this.initialProps = Object.freeze({
      ...definition.presentation,
      data: definition.presentation.data ? { ...definition.presentation.data } : undefined,
    });
    const initialState: StepPresentation<T> = {
      ...this.initialProps,
      data: this.initialProps.data ? { ...this.initialProps.data } : undefined,
    };
    this.props = new Observable<StepPresentation<T>>(initialState);
  }

  reset() {
    this.props.set({
      ...this.initialProps,
      data: this.initialProps.data ? { ...this.initialProps.data } : undefined,
    });
  }

  getElement() {
    return resolveTargetElement(this.target);
  }
}
