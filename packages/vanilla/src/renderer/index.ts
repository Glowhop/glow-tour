import type { StepDefinition, WorkflowControls, WorkflowState } from "../../../core/src";

export interface VanillaRendererPayload {
  state: WorkflowState;
  step: StepDefinition | null;
  controls: WorkflowControls;
}

export interface VanillaRenderer {
  render(payload: VanillaRendererPayload): void;
  destroy(): void;
}

export interface VanillaRendererOptions {
  nextLabel?: string;
  previousLabel?: string;
  finishLabel?: string;
}

function toText(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    if ("text" in value && typeof value.text === "string") {
      return value.text;
    }

    if ("id" in value && typeof value.id === "string") {
      return value.id;
    }
  }

  return "";
}

export function createVanillaRenderer(
  container: HTMLElement,
  options: VanillaRendererOptions = {},
): VanillaRenderer {
  return {
    render({ state, step }) {
      if (
        state.status === "cancelled" ||
        state.status === "finished" ||
        state.status === "error" ||
        !step
      ) {
        container.innerHTML = "";
        return;
      }

      const props = step.presentation;
      const title = toText(props.title);
      const content = toText(props.content);
      const previousLabel = options.previousLabel ?? "previous";
      const nextLabel = state.isLastStep
        ? (options.finishLabel ?? options.nextLabel ?? "finish")
        : (options.nextLabel ?? "next");
      const cancelButton = state.canCancel ? '<button data-action="cancel">cancel</button>' : "";
      container.innerHTML = `
        <section data-tour-status="${state.status}">
          <h2>${title}</h2>
          <p>${content}</p>
          <footer>
            <button data-action="prev">${previousLabel}</button>
            <button data-action="next">${nextLabel}</button>
            ${cancelButton}
          </footer>
        </section>
      `;
    },
    destroy() {
      container.innerHTML = "";
    },
  };
}
