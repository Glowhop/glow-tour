import type { StepDefinition } from "../types";
import { isInViewport, roundByDPR, viewportDimensions } from "../utils/utils";
import GlowTourElement from "./base";

const DEFAULT_POPOVER_GAP = 14;
const DEFAULT_TRY_ORDER = ["bottom", "top", "right", "left"] as const;
const REPLACEMENT_DIFF = 50; // pixels

type PopoverPlacement = (typeof DEFAULT_TRY_ORDER)[number];

export default class PopoverElement<T> extends GlowTourElement<T> {
  protected _getNextStyles(position: DOMRect, step: StepDefinition<T>): Keyframe {
    const nextPosition = this._getNextPosition(position, step);

    return {
      transform: `translate(${roundByDPR(nextPosition.x)}px, ${roundByDPR(nextPosition.y)}px)`,
    };
  }

  protected _getNextPosition(targetPosition: DOMRect, step: StepDefinition<T>) {
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

  async moveToTarget(
    nextPosition: DOMRect,
    step: StepDefinition<T>,
    appear: boolean,
    onChange?: () => void,
  ) {
    if (!appear) {
      await this._disappear();
    }

    onChange?.();

    await this._appear(nextPosition, step);
  }

  initializeProps() {
    const el = this.getElement();
    if (!el) {
      console.warn("No popover element found");
      return;
    }

    el.style.setProperty("position", "fixed");
    el.style.setProperty("z-index", "10000");
    el.style.setProperty("top", "0px");
    el.style.setProperty("left", "0px");
    el.style.setProperty("opacity", "0");
    el.style.setProperty("transform-origin", "center center");
    el.setAttribute("aria-hidden", "true");
    el.setAttribute("inert", "true");
    // el.style.setProperty("transform", "translate(0px, 0px)");
  }

  updatePosition(nextPosition: DOMRect, step: StepDefinition<T>): void {
    const nextCoordinates = this._getNextPosition(nextPosition, step);
    const currentTransform = this.element.style.transform;
    const currentCoordinatesStr = currentTransform.match(/translate\(([^)]+)\)/)?.[1];
    const currentCoordinatesList = currentCoordinatesStr
      ? currentCoordinatesStr.split(",").map((coord) => parseFloat(coord.trim()))
      : [0, 0];
    const currentCoordinates = { x: currentCoordinatesList[0], y: currentCoordinatesList[1] };
    const diffX = Math.abs(nextCoordinates.x - currentCoordinates.x);
    const diffY = Math.abs(nextCoordinates.y - currentCoordinates.y);

    if (diffX > REPLACEMENT_DIFF || diffY > REPLACEMENT_DIFF) {
      this.moveToTarget(nextPosition, step, false);
    }
  }

  async _appear(position: DOMRect, step: StepDefinition<T>) {
    const defaultStyles = this._getNextStyles(position, step);

    for (const [key, value] of Object.entries(defaultStyles)) {
      value != null && this.element.style.setProperty(key, String(value));
    }

    const animation = this.element.animate(
      [
        {
          opacity: 1,
        },
      ],
      this._getAnimationOptions(),
    );
    await animation.finished;

    this.element.style.setProperty("opacity", "1");
    this.element.removeAttribute("aria-hidden");
    this.element.removeAttribute("inert");
  }

  async _disappear() {
    const animation = this.element.animate(
      {
        opacity: 0,
      },
      this._getAnimationOptions(),
    );

    await animation.finished;

    animation.commitStyles();

    this.element.style.setProperty("opacity", "0");
    this.element.setAttribute("aria-hidden", "true");
    this.element.setAttribute("inert", "true");
    this.element.style.removeProperty("transform");
    this.element.style.setProperty("opacity", "0");
  }
}
