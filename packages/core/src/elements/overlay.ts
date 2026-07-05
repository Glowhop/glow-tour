import type { StepDefinition } from "../types";

import { roundedRectPath, viewportDimensions } from "../utils/utils";
import GlowTourElement from "./base";

const DEFAULT_OVERLAY_PADDING = 16;
const DEFAULT_OVERLAY_RADIUS = 12;

//fill-rule: evenodd; clip-rule: evenodd; stroke-linejoin: round; stroke-miterlimit: 2; z-index: 10000; position: fixed; top: 0px; left: 0px; width: 100%; height: 100%;

export const DEFAULT_OVERLAY_STYLE = {
  fill: "rgb(0, 0, 0)",
  fillOpacity: "0.7",
  pointerEvents: "auto",
  cursor: "auto",
};

export default class OverlayElement<T> extends GlowTourElement<T> {
  moveToTarget(nextPosition: DOMRect, step: StepDefinition<T>) {
    return new Promise<void>((resolve) => {
      const keyframes = [this._getNextStyles(nextPosition, step)];

      const path = this.element.querySelector("path");
      if (!path) {
        console.warn("No overlay path element found");
        resolve(void 0);
        return;
      }

      const animation = path.animate(keyframes, this._getAnimationOptions());
      animation.onfinish = () => {
        resolve(void 0);
      };
    });
  }

  _getNextStyles(position: DOMRect, step: StepDefinition<T>): Keyframe {
    const { padding, radius, color, opacity } = step.overlay || {};

    const path = roundedRectPath(position, viewportDimensions(), {
      padding: padding ?? DEFAULT_OVERLAY_PADDING,
      radius: radius ?? DEFAULT_OVERLAY_RADIUS,
    });

    return {
      ...DEFAULT_OVERLAY_STYLE,
      d: `path("${path}")`,
      fill: color,
      fillOpacity: opacity != null ? String(opacity) : DEFAULT_OVERLAY_STYLE.fillOpacity,
    };
  }

  initializeProps() {
    const el = this.getElement();
    if (!el) {
      console.warn("No overlay element found");
      return;
    }
    const viewport = viewportDimensions();
    //fill-rule: evenodd; clip-rule: evenodd; stroke-linejoin: round; stroke-miterlimit: 2; z-index: 10000; position: fixed; top: 0px; left: 0px; width: 100%; height: 100%;
    //viewBox
    el.style.setProperty("position", "fixed");
    el.style.setProperty("z-index", "10000");
    el.style.setProperty("top", "0px");
    el.style.setProperty("left", "0px");
    el.style.setProperty("width", "100%");
    el.style.setProperty("height", "100%");
    el.style.setProperty("fill-rule", "evenodd");
    el.style.setProperty("clip-rule", "evenodd");
    el.style.setProperty("stroke-linejoin", "round");
    el.style.setProperty("stroke-miterlimit", "2");
    el.style.setProperty("opacity", "0");
    el.style.setProperty("pointer-events", "none");

    el.setAttribute("aria-hidden", "true");
    el.setAttribute("viewBox", `0 0 ${viewport.width} ${viewport.height}`);
    el.setAttribute("inert", "true");

    const path = el.querySelector("path");
    if (!path) {
      console.warn("No overlay path element found");
      return;
    }

    path.setAttribute("opacity", "0.7");
    path.setAttribute("pointer-events", "auto");
    path.setAttribute("cursor", "auto");

    //fill: rgb(0, 0, 0);opacity: 0.7;pointer-events: auto;cursor: auto;
  }
}
