import { TourStore } from "../state/store";
import type { WorkflowDefinition } from "../types";

export class WorkflowInstance<T> extends TourStore<T> {
  constructor(readonly definition: WorkflowDefinition<T>) {
    super(definition);
  }
}

export function createWorkflow<T>(definition: WorkflowDefinition<T>) {
  return new WorkflowInstance<T>(definition);
}
