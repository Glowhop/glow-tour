const DEFAULT_ANIMATION_DURATION = 180;
const DEFAULT_ANIMATION_EASING = "ease-out";


export default abstract class GlowTourElement {

    constructor(private element: HTMLElement, public options?: { duration?: number; easing?: string }) {

    }

    private _getAnimationOptions() {
        return {
            duration: this.options?.duration ?? DEFAULT_ANIMATION_DURATION,
            easing: this.options?.easing ?? DEFAULT_ANIMATION_EASING,
        };
    }

    private _appear(): Animation | null {
        if (!this.element) return null

        const animation = this.getAppearKeyframes();

        return this.element.animate(animation, this._getAnimationOptions());
    }
    private _disappear(): Animation | null {
        if (!this.element) return null;

        const animation = this.getAppearKeyframes().reverse();

        return this.element.animate(animation, this._getAnimationOptions());
    }


    protected abstract getAppearKeyframes(): [Keyframe, Keyframe];

    //permet de faire fonctionner les variables CSS
    //ex: ajoute transform: translate(var(--tooltip-x), var(--tooltip-y))
    protected abstract enableSync(): void;

    //permet de stopper les effets des variables CSS
    //ex: supprime transform: translate(var(--tooltip-x), var(--tooltip-y))
    protected abstract disableSync(): void;

    protected abstract getPreviousKeyframe(): Keyframe;

    protected abstract getNextkeyframe(): Keyframe;

    protected abstract move(): void;

    isShown() {
        if (!this.element) return false;
        return this.element.dataset.show === "true";
    }

    getElement(): HTMLElement | null {
        return this.element;
    }

    setShow(show: boolean) {
        const el = this.getElement();
        if (!el) return;

        // on ajoute directement les CSS variables pour voir les animations
        if (show) {
            //on ajoute transform CSS variables
            this.enableSync();
            el.dataset.show = "true";
        }

        const anim = show ? this._appear() : this._disappear();

        if (!show) {
            const onFinish = () => {
                el.dataset.show = "false";
                // on supprime transform CSS variables
                this.disableSync();
            };

            //on attend la fin de l'animation pour clear
            if (!anim) {
                console.warn("no animation found");
                onFinish();
            } else {
                anim.onfinish = onFinish;
                anim.oncancel = onFinish;
            }
        }

        return anim;
    }
}