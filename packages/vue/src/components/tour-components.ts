import { defineComponent, h, onBeforeUnmount, onMounted, ref } from "vue";
import { type GlowTourElementName, glowTour } from "../../../core/src";

function namedComponentName(name: string) {
  return `GlowTour${name}`;
}

const POPOVER_ID = "glow-tour-popover";
const TITLE_ID = "glow-tour-title";
const DESCRIPTION_ID = "glow-tour-description";

function useTourElement(name: GlowTourElementName) {
  const element = ref<Element | null>(null);

  onMounted(() => {
    glowTour.state.registerElement(name, element.value);
  });

  onBeforeUnmount(() => {
    glowTour.state.registerElement(name, null);
  });

  return element;
}

export const GlowTourRoot = defineComponent({
  name: namedComponentName("Root"),
  setup(_props, { slots }) {
    const element = useTourElement("root");
    return () => h("section", { "data-glow-tour-root": "", ref: element }, slots.default?.());
  },
});

export const GlowTourHeader = defineComponent({
  name: namedComponentName("Header"),
  props: {
    id: { default: TITLE_ID, type: String },
  },
  setup(props, { slots }) {
    const element = useTourElement("header");
    return () =>
      h("header", { "data-glow-tour-header": "", id: props.id, ref: element }, slots.default?.());
  },
});

export const GlowTourContent = defineComponent({
  name: namedComponentName("Content"),
  props: {
    ariaLive: { default: "polite", type: String },
    id: { default: DESCRIPTION_ID, type: String },
  },
  setup(props, { slots }) {
    const element = useTourElement("content");
    return () =>
      h(
        "div",
        { "aria-live": props.ariaLive, "data-glow-tour-content": "", id: props.id, ref: element },
        slots.default?.(),
      );
  },
});

export const GlowTourFooter = defineComponent({
  name: namedComponentName("Footer"),
  setup(_props, { slots }) {
    const element = useTourElement("footer");
    return () => h("footer", { "data-glow-tour-footer": "", ref: element }, slots.default?.());
  },
});

export const GlowTourPopover = defineComponent({
  name: namedComponentName("Popover"),
  props: {
    ariaDescribedby: { default: DESCRIPTION_ID, type: String },
    ariaLabelledby: { default: TITLE_ID, type: String },
    id: { default: POPOVER_ID, type: String },
    role: { default: "dialog", type: String },
  },
  setup(props, { slots }) {
    const element = useTourElement("popover");
    return () =>
      h(
        "section",
        {
          "aria-describedby": props.ariaDescribedby,
          "aria-labelledby": props.ariaLabelledby,
          "data-glow-tour-popover": "",
          id: props.id,
          ref: element,
          role: props.role,
        },
        slots.default?.(),
      );
  },
});

export const GlowTourOverlay = defineComponent({
  name: namedComponentName("Overlay"),
  props: {
    ariaHidden: { default: true, type: Boolean },
    focusable: { default: "false", type: String },
    viewBox: { default: "0 0 0 0", type: String },
  },
  setup(props, { slots }) {
    const element = useTourElement("overlay");
    return () =>
      h(
        "svg",
        {
          "aria-hidden": props.ariaHidden,
          "data-glow-tour-overlay": "",
          focusable: props.focusable,
          ref: element,
          role: "presentation",
          viewBox: props.viewBox,
        },
        [
          h("path", { "data-glow-tour-overlay-path": "", "fill-rule": "evenodd" }),
          slots.default?.(),
        ],
      );
  },
});

export const GlowTourBackTrigger = defineComponent({
  name: namedComponentName("BackTrigger"),
  props: {
    ariaControls: { default: POPOVER_ID, type: String },
    ariaKeyshortcuts: { default: "ArrowLeft", type: String },
    ariaLabel: { default: "Back step", type: String },
    backLabel: { default: "back", type: String },
  },
  setup(props, { slots }) {
    const element = useTourElement("back-trigger");
    return () =>
      h(
        "button",
        {
          "aria-controls": props.ariaControls,
          "aria-keyshortcuts": props.ariaKeyshortcuts,
          "aria-label": props.ariaLabel,
          "data-action": "back",
          "data-glow-tour-back-trigger": "",
          ref: element,
          type: "button",
        },
        slots.default?.() ?? props.backLabel,
      );
  },
});

export const GlowTourNextTrigger = defineComponent({
  name: namedComponentName("NextTrigger"),
  props: {
    ariaControls: { default: POPOVER_ID, type: String },
    ariaKeyshortcuts: { default: "Enter ArrowRight", type: String },
    ariaLabel: { default: "Next step", type: String },
    finishLabel: { default: "finish", type: String },
    nextLabel: { default: "next", type: String },
  },
  setup(props, { slots }) {
    const element = useTourElement("next-trigger");
    const isLastStep = ref(glowTour.state.get().isLastStep);
    let unsubscribe: (() => void) | undefined;

    onMounted(() => {
      unsubscribe = glowTour.state.subscribe((state) => {
        isLastStep.value = state.isLastStep;
      });
    });

    onBeforeUnmount(() => {
      unsubscribe?.();
    });

    return () =>
      h(
        "button",
        {
          "aria-controls": props.ariaControls,
          "aria-keyshortcuts": props.ariaKeyshortcuts,
          "aria-label": props.ariaLabel,
          "data-action": "next",
          "data-glow-tour-next-trigger": "",
          ref: element,
          type: "button",
        },
        slots.default?.() ?? (isLastStep.value ? props.finishLabel : props.nextLabel),
      );
  },
});
