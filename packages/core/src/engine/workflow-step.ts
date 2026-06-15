import { Observable } from "@glowhop/observables";
import type { StepDefinition, StepPresentation } from "../types";

export class WorkflowStep {
  readonly target: StepDefinition["target"];
  readonly actions: StepDefinition["actions"];
  readonly eventHandlers: StepDefinition["eventHandlers"];
  readonly nextAction: StepDefinition["nextAction"];
  readonly previousAction: StepDefinition["previousAction"];
  readonly cancelAction: StepDefinition["cancelAction"];
  readonly props: Observable<StepDefinition["presentation"]>;
  readonly initialProps: Readonly<StepDefinition["presentation"]>;

  constructor(readonly definition: StepDefinition) {
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
    const initialState: StepPresentation = {
      ...this.initialProps,
      data: this.initialProps.data ? { ...this.initialProps.data } : undefined,
    };
    this.props = new Observable<StepPresentation>(initialState);
  }

  reset() {
    this.props.set({
      ...this.initialProps,
      data: this.initialProps.data ? { ...this.initialProps.data } : undefined,
    });
  }

  getElement() {
    return document.querySelector<HTMLElement>(this.target);
  }
}
