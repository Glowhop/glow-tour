import type { WorkflowInstance } from "../../core/src";
import { glowTour } from "../../core/src";

export { GlowTour } from "./components/tour-components";

export interface ReactTutorialSnapshot {
  status: ReturnType<WorkflowInstance["state"]["get"]>["status"];
  currentStepIndex: number;
  totalSteps: number;
  step: ReturnType<WorkflowInstance["state"]["get"]>["currentStep"];
}

export function createReactTutorialBridge(workflow: WorkflowInstance) {
  const getSnapshot = (): ReactTutorialSnapshot => {
    const state = workflow.state.get();
    return {
      status: state.status,
      currentStepIndex: state.currentStepIndex,
      totalSteps: state.totalSteps,
      step: state.currentStep,
    };
  };

  return {
    subscribe: (listener: () => void) => workflow.subscribe(() => listener()),
    getSnapshot,
    getServerSnapshot: getSnapshot,
    getTargetElement: () => {
      const step = workflow.state.get().currentStep;
      return step ? document.querySelector<HTMLElement>(step.target) : null;
    },
    controls: workflow,
  };
}

export { glowTour };
