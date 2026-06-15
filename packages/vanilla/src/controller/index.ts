import type { WorkflowInstance } from "../../../core/src";
import type { VanillaRenderer } from "../renderer";

export function createVanillaTutorialController(
  workflow: WorkflowInstance,
  renderer: VanillaRenderer,
) {
  const unsubscribe = workflow.subscribe((state) => {
    renderer.render({
      state,
      step: state.currentStep,
      controls: workflow,
    });
  });

  return {
    workflow,
    start: () => workflow.start(),
    destroy: () => {
      unsubscribe();
      workflow.cancel();
      workflow.destroy();
      renderer.destroy();
    },
  };
}
