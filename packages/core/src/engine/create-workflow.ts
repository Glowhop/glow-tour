import { TourStore } from "../state/store";
import type { WorkflowDefinition } from "../types";

export class WorkflowInstance extends TourStore {
  constructor(readonly definition: WorkflowDefinition) {
    super(definition);
  }
}

export function createWorkflow(definition: WorkflowDefinition) {
  return new WorkflowInstance(definition);
}
