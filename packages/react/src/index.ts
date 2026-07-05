import type { StartOptions, WorkflowDefinition, WorkflowInstance } from "../../core/src";
import { create, createTourStore } from "../../core/src";
import { resolveTargetElement } from "../../core/src/utils/utils";

export { GlowTour } from "./components/tour-components";

export interface ReactTutorialSnapshot {
  status: ReturnType<WorkflowInstance<React.ReactNode>["get"]>["status"];
  currentStepIndex: number;
  totalSteps: number;
  step: ReturnType<WorkflowInstance<React.ReactNode>["get"]>["currentStep"];
}

export function createReactTutorialBridge(workflow: WorkflowInstance<React.ReactNode>) {
  const getSnapshot = (): ReactTutorialSnapshot => {
    const state = workflow.get();
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
    getTargetElement: async () => {
      const step = workflow.get().currentStep;

      return step?.target ? await resolveTargetElement(step?.target) : null;
    },
    controls: workflow,
  };
}

const state = createTourStore<React.ReactNode>();

export const glowTour = {
  create(name: string, options: StartOptions = {}) {
    return create<React.ReactNode>(name, options);
  },
  run(workflow: WorkflowDefinition<React.ReactNode>) {
    return state.start(workflow);
  },
  state,
};
