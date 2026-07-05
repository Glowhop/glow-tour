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
      h("main", { class: "app-screen bg-lime-50/40" }, [
        h("a", { class: "back-link inline-flex items-center gap-2 text-emerald-700", href: "/" }, "Playground"),
        h("section", { class: "app-panel shadow-sm ring-1 ring-black/5" }, [
          h("h1", { class: "text-3xl font-semibold tracking-tight" }, "Vue app"),
          h("button", { class: "w-fit", type: "button", onClick: startTour }, "Start tour"),
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
