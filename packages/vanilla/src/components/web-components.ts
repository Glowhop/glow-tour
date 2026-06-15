import { type GlowTourElementName, glowTour } from "../../../core/src";

export const GLOW_TOUR_ELEMENT_NAMES = [
  "glow-tour-root",
  "glow-tour-header",
  "glow-tour-progress",
  "glow-tour-content",
  "glow-tour-footer",
  "glow-tour-popover",
  "glow-tour-previous-trigger",
  "glow-tour-next-trigger",
  "glow-tour-overlay",
] as const;

const ELEMENT_REGISTRY: Record<(typeof GLOW_TOUR_ELEMENT_NAMES)[number], GlowTourElementName> = {
  "glow-tour-root": "root",
  "glow-tour-header": "header",
  "glow-tour-progress": "progress",
  "glow-tour-content": "content",
  "glow-tour-footer": "footer",
  "glow-tour-popover": "popover",
  "glow-tour-previous-trigger": "previous-trigger",
  "glow-tour-next-trigger": "next-trigger",
  "glow-tour-overlay": "overlay",
};

const POPOVER_ID = "glow-tour-popover";
const TITLE_ID = "glow-tour-title";
const DESCRIPTION_ID = "glow-tour-description";
const VANILLA_LABEL_CLEANUPS = new WeakMap<HTMLElement, () => void>();

function canRegisterCustomElements() {
  return typeof customElements !== "undefined" && typeof HTMLElement !== "undefined";
}

function createOverlaySvg(host: HTMLElement) {
  const existing = host.querySelector<SVGSVGElement>("svg[data-glow-tour-overlay]");
  if (existing) {
    return existing;
  }

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("data-glow-tour-overlay", "");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("role", "presentation");
  svg.setAttribute("viewBox", "0 0 0 0");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("data-glow-tour-overlay-path", "");
  path.setAttribute("fill-rule", "evenodd");
  svg.appendChild(path);
  host.appendChild(svg);

  return svg;
}

function syncTriggerLabel(element: HTMLElement, name: GlowTourElementName) {
  VANILLA_LABEL_CLEANUPS.get(element)?.();

  if (element.childNodes.length > 0) {
    return;
  }

  if (name === "previous-trigger") {
    element.textContent = element.getAttribute("previous-label") ?? "previous";
    return;
  }

  if (name !== "next-trigger") {
    return;
  }

  const sync = () => {
    const state = glowTour.state.get();
    element.textContent = state.isLastStep
      ? (element.getAttribute("finish-label") ?? "finish")
      : (element.getAttribute("next-label") ?? "next");
  };

  sync();
  VANILLA_LABEL_CLEANUPS.set(element, glowTour.state.subscribe(sync));
}

export function registerGlowTourElements() {
  if (!canRegisterCustomElements()) {
    return;
  }

  for (const name of GLOW_TOUR_ELEMENT_NAMES) {
    if (!customElements.get(name)) {
      const elementName = ELEMENT_REGISTRY[name];
      customElements.define(
        name,
        class extends HTMLElement {
          connectedCallback() {
            this.setAttribute(`data-${name}`, "");
            if (name === "glow-tour-overlay") {
              glowTour.state.registerElement(elementName, createOverlaySvg(this));
              return;
            }
            if (name === "glow-tour-header" && !this.hasAttribute("id")) {
              this.setAttribute("id", TITLE_ID);
            }
            if (name === "glow-tour-content" && !this.hasAttribute("id")) {
              this.setAttribute("id", DESCRIPTION_ID);
            }
            if (name === "glow-tour-content" && !this.hasAttribute("aria-live")) {
              this.setAttribute("aria-live", "polite");
            }
            if (name === "glow-tour-popover" && !this.hasAttribute("id")) {
              this.setAttribute("id", POPOVER_ID);
            }
            if (name === "glow-tour-popover" && !this.hasAttribute("role")) {
              this.setAttribute("role", "dialog");
            }
            if (name === "glow-tour-popover" && !this.hasAttribute("aria-labelledby")) {
              this.setAttribute("aria-labelledby", TITLE_ID);
            }
            if (name === "glow-tour-popover" && !this.hasAttribute("aria-describedby")) {
              this.setAttribute("aria-describedby", DESCRIPTION_ID);
            }
            if (name === "glow-tour-previous-trigger" && !this.hasAttribute("aria-keyshortcuts")) {
              this.setAttribute("aria-keyshortcuts", "ArrowLeft");
            }
            if (name === "glow-tour-previous-trigger" && !this.hasAttribute("aria-controls")) {
              this.setAttribute("aria-controls", POPOVER_ID);
            }
            if (name === "glow-tour-next-trigger" && !this.hasAttribute("aria-keyshortcuts")) {
              this.setAttribute("aria-keyshortcuts", "Enter ArrowRight");
            }
            if (name === "glow-tour-next-trigger" && !this.hasAttribute("aria-controls")) {
              this.setAttribute("aria-controls", POPOVER_ID);
            }
            glowTour.state.registerElement(elementName, this);
            syncTriggerLabel(this, elementName);
          }

          disconnectedCallback() {
            VANILLA_LABEL_CLEANUPS.get(this)?.();
            VANILLA_LABEL_CLEANUPS.delete(this);
            glowTour.state.registerElement(elementName, null);
          }
        },
      );
    }
  }
}
