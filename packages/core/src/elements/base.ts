import type { StepDefinition } from "../types";

const DEFAULT_ANIMATION_DURATION = 180;
const DEFAULT_ANIMATION_EASING = "ease-out";

export default abstract class GlowTourElement<T> {
  constructor(
    protected element: HTMLElement | SVGSVGElement,
    public options?: { duration?: number; easing?: string },
  ) {}

  setAnimationOptions(options: { duration?: number; easing?: string }) {
    this.options = options;
  }

  protected _getAnimationOptions(): KeyframeAnimationOptions {
    return {
      duration: this.options?.duration ?? DEFAULT_ANIMATION_DURATION,
      easing: this.options?.easing ?? DEFAULT_ANIMATION_EASING,
      fill: "forwards",
    };
  }

  protected abstract _disappear(): Promise<void>;

  protected abstract _getNextStyles(position: DOMRect, step: StepDefinition<T>): Keyframe;

  abstract updatePosition(nextPosition: DOMRect, step: StepDefinition<T>): void;
  // abstract moveToTarget(
  //   nextPosition: DOMRect,
  //   step: StepDefinition<T>,
  //   appear: boolean,
  // ): Promise<void>;

  abstract initializeProps(): void;

  getElement(): HTMLElement | SVGSVGElement | null {
    return this.element;
  }

  disappear() {
    return this._disappear();
  }
}
