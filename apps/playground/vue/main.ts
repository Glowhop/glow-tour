import {
  GlowTourContent,
  GlowTourFooter,
  GlowTourHeader,
  GlowTourNextTrigger,
  GlowTourOverlay,
  GlowTourPopover,
  GlowTourPreviousTrigger,
  GlowTourRoot,
  glowTour,
} from "@glowhop/vue-tour";
import "@glowhop/styles-tour/default.css";
import { createApp, h } from "vue";
import "../src/styles.css";

const tour = glowTour
  .create("vue-playground", {
    overlay: { color: "#101820", opacity: 0.58, padding: 10, radius: 8 },
  })
  .step({
    target: "#vue-tour-id",
    title: "Vue step",
    content: "This step targets a real Vue-rendered element.",
  })
  .finish();

createApp({
  setup() {
    const startTour = () => {
      void glowTour.run(tour);
    };

    return () =>
      h("main", { class: "app-screen" }, [
        h("a", { class: "back-link", href: "/" }, "Playground"),
        h("section", { class: "app-panel" }, [
          h("h1", "Vue app"),
          h("button", { type: "button", onClick: startTour }, "Start tour"),
          h("span", { id: "vue-tour-id", class: "target-pill" }, "AHHH"),
          h(GlowTourRoot, null, () => [
            h(GlowTourOverlay),
            h(GlowTourPopover, null, () => [
              h(GlowTourHeader),
              h(GlowTourContent),
              h(GlowTourFooter, null, () => [
                h(GlowTourPreviousTrigger, { previousLabel: "prev" }),
                h(GlowTourNextTrigger, { finishLabel: "finish", nextLabel: "next" }),
              ]),
            ]),
          ]),
        ]),
      ]);
  },
}).mount("#vue-root");
