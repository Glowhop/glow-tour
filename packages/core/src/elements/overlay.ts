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

export default class OverlayElement extends GlowTourElement {
  moveToTarget(nextPosition: DOMRect, step: StepDefinition) {
    return new Promise<void>((resolve) => {
      const keyframes = [this._getNextStyles(nextPosition, step)];
      const animation = this.element.animate(keyframes, this._getAnimationOptions());
      animation.onfinish = () => {
        resolve(void 0);
      };
    });
  }

  _getNextStyles(position: DOMRect, step: StepDefinition): Keyframe {
    const { padding, radius, color, opacity } = step.overlay || {};

    const path = roundedRectPath(position, viewportDimensions(), {
      padding: padding ?? DEFAULT_OVERLAY_PADDING,
      radius: radius ?? DEFAULT_OVERLAY_RADIUS,
    });

    return {
      ...DEFAULT_OVERLAY_STYLE,
      d: path,
      fill: color,
      fillOpacity: opacity != null ? String(opacity) : DEFAULT_OVERLAY_STYLE.fillOpacity,
    };
  }
}
