import { glowTour } from "@glowhop/core-tour";
import "@glowhop/styles-tour/default.css";
import { registerGlowTourElements } from "@glowhop/vanilla-tour";
import "../src/styles.css";

registerGlowTourElements();

const tour = glowTour
  .create("vanilla-playground", {
    overlay: { color: "#101820", opacity: 0.58, padding: 10, radius: 8 },
  })
  .step({
    target: "#vanilla-tour-id",
    title: "Vanilla step",
    content: "This step targets a vanilla DOM element.",
  })
  .finish();

document.querySelector("[data-start-tour]")?.addEventListener("click", () => {
  void glowTour.run(tour);
});
