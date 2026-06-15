import { create } from "./builder";
import { createTourStore } from "./state/store";
import type { StartOptions, WorkflowDefinition } from "./types";

const state = createTourStore();

export const glowTour = {
  create(name: string, options: StartOptions = {}) {
    return create(name, options);
  },
  run(workflow: WorkflowDefinition) {
    return state.start(workflow);
  },
  state,
};
