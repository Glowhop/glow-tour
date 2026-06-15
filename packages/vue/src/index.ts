import type { WorkflowInstance } from "../../core/src";
import { glowTour } from "../../core/src";

export * from "./components/tour-components";

export function createVueTutorialBridge(workflow: WorkflowInstance) {
  return {
    state: workflow.state,
    getCurrentStep: () => workflow.state.get().currentStep,
    getTargetElement: () => {
      const step = workflow.state.get().currentStep;
      return step ? document.querySelector<HTMLElement>(step.target) : null;
    },
    controls: workflow,
  };
}

export { glowTour };
