import type { StepDefinition } from "../types";

const DEFAULT_ANIMATION_DURATION = 180;
const DEFAULT_ANIMATION_EASING = "ease-out";

const APPEAR_KEYFRAME = {
  opacity: 1,
  scale: 1,
};

const DISAPPEAR_KEYFRAME = {
  opacity: 0,
  scale: 0.8,
};

export default abstract class GlowTourElement<T> {
  constructor(
    protected element: HTMLElement | SVGSVGElement,
    public options?: { duration?: number; easing?: string },
  ) {}

  setAnimationOptions(options: { duration?: number; easing?: string }) {
    this.options = options;
  }

  protected _getAnimationOptions() {
    return {
      duration: this.options?.duration ?? DEFAULT_ANIMATION_DURATION,
      easing: this.options?.easing ?? DEFAULT_ANIMATION_EASING,
      fill: "forwards" as const,
    };
  }

  protected _appear(position: DOMRect, step: StepDefinition<T>): Animation | null {
    if (!this.element) return null;

    const defaultStyles = this._getNextStyles(position, step);

    for (const [key, value] of Object.entries(defaultStyles)) {
      value != null && this.element.style.setProperty(key, String(value));
    }

    return this.element.animate(APPEAR_KEYFRAME, this._getAnimationOptions());
  }
  protected _disappear(): Animation | null {
    if (!this.element) return null;

    const animation = [DISAPPEAR_KEYFRAME];

    return this.element.animate(animation, this._getAnimationOptions());
  }

  protected abstract _getNextStyles(position: DOMRect, step: StepDefinition<T>): Keyframe;

  //   abstract updatePosition(position: DOMRect): Keyframe;

  abstract moveToTarget(nextPosition: DOMRect, step: StepDefinition<T>): Promise<void>;

  abstract initializeProps(): void;

  getElement(): HTMLElement | SVGSVGElement | null {
    return this.element;
  }

  show(nextPosition: DOMRect, step: StepDefinition<T>) {
    const el = this.getElement();
    if (!el) return;

    const anim = this._appear(nextPosition, step);

    return new Promise<void>((resolve) => {
      const onFinish = () => {
        resolve();
      };

      //on attend la fin de l'animation pour clear
      if (!anim) {
        console.warn("no animation found");
        onFinish();
      } else {
        anim.onfinish = onFinish;
      }
    });
  }

  async hide() {
    const el = this.getElement();
    if (!el) return;

    const anim = this._disappear();

    return new Promise<void>((resolve) => {
      const onFinish = () => {
        resolve();
      };
      if (!anim) {
        console.warn("no animation found");
        onFinish();
      } else {
        anim.onfinish = onFinish;
      }
    });
  }
}
