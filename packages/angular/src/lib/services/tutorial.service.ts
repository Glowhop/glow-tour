import type { WorkflowInstance } from "../../../../core/src";

export class TutorialService {
  constructor(private readonly workflow: WorkflowInstance) {}

  get state() {
    return this.workflow.state;
  }

  get currentStep() {
    return this.workflow.state.get().currentStep;
  }

  get targetElement() {
    const step = this.currentStep;
    return step ? document.querySelector<HTMLElement>(step.target) : null;
  }

  start() {
    return this.workflow.start();
  }

  next() {
    return this.workflow.next();
  }

  back() {
    return this.workflow.back();
  }

  cancel() {
    return this.workflow.cancel();
  }
}
