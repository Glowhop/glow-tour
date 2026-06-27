import type { StepDefinition } from "../types";
import { isInViewport, roundByDPR, viewportDimensions } from "../utils/utils";
import GlowTourElement from "./base";

export const DEFAULT_POPOVER_STYLE = {
  position: "fixed",
  zIndex: "10000",
  top: "0px",
  left: "0px",
  transform: "translate(0px, 0px)",
};

const DEFAULT_POPOVER_GAP = 14;
const DEFAULT_TRY_ORDER = ["bottom", "top", "right", "left"] as const;

type PopoverPlacement = (typeof DEFAULT_TRY_ORDER)[number];

export default class PopoverElement extends GlowTourElement {
  protected _getNextStyles(position: DOMRect, step: StepDefinition): Keyframe {
    const nextPosition = this._getNextPosition(position, step);

    return {
      ...DEFAULT_POPOVER_STYLE,
      transform: `translate(${roundByDPR(nextPosition.x)}px, ${roundByDPR(nextPosition.y)}px)`,
    };
  }

  protected _getNextPosition(targetPosition: DOMRect, step: StepDefinition) {
    const currentElement = this.getElement();
    if (!currentElement) {
      return {
        x: 0,
        y: 0,
      };
    }

    const gap = step.popover?.gap ?? DEFAULT_POPOVER_GAP;

    const popoverPosition = currentElement.getBoundingClientRect();

    const candidates: Record<PopoverPlacement, { x: number; y: number }> = {
      top: {
        x: targetPosition.left,
        y: targetPosition.top - popoverPosition.height - gap,
      },
      bottom: {
        x: targetPosition.left,
        y: targetPosition.bottom + gap,
      },
      left: {
        x: targetPosition.left - popoverPosition.width - gap,
        y: targetPosition.top,
      },
      right: {
        x: targetPosition.right + gap,
        y: targetPosition.top,
      },
    };

    const tryOrder = step.popover?.placementTryOrder ?? DEFAULT_TRY_ORDER;

    for (const placement of tryOrder) {
      const candidate = candidates[placement];
      const isVisible = isInViewport({
        left: candidate.x,
        top: candidate.y,
        right: candidate.x + popoverPosition.width,
        bottom: candidate.y + popoverPosition.height,
      });

      if (isVisible) {
        return candidate;
      }
    }

    const viewport = viewportDimensions();

    return {
      x: (viewport.width - popoverPosition.width) / 2,
      y: (viewport.height - popoverPosition.height) / 2,
    };
  }

  async moveToTarget(nextPosition: DOMRect, step: StepDefinition) {
    return new Promise<void>((resolve) => {
      const firstAnimation = this._disappear();

      const onFinish = () => {
        const nextStyles = this._getNextStyles(nextPosition, step);
        for (const [key, value] of Object.entries(nextStyles)) {
          value != null && this.element.style.setProperty(key, String(value));
        }

        const secondAnimation = this._appear(nextPosition, step);

        if (!secondAnimation) {
          resolve(void 0);
          return;
        }

        secondAnimation.onfinish = () => {
          resolve(void 0);
        };
      };

      if (!firstAnimation) {
        onFinish();
        return;
      }

      firstAnimation.onfinish = onFinish;
    });
  }
}
