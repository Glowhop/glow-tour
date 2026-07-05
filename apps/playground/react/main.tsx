import { GlowTour, glowTour } from "@glowhop/react-tour";
import { createRoot } from "react-dom/client";
import "../src/styles.css";

const tour = glowTour
  .create("react-playground", {
    overlay: { color: "#101820", opacity: 0.58, padding: 10, radius: 8 },
    popover: {
      buttons: {
        cancelLabel: "Exit tour",
        finishLabel: "Finish tour",
        nextLabel: "Next step",
        previousLabel: "Previous step",
      },
    },
  })
  .step({
    target: "#react-tour-id-1",
    title: "React step",
    content: "This step targets a real React-rendered element.",
  })
  .step({
    target: "#react-tour-id-2",
    title: "React step",
    content: "This step targets a real React-rendered element.",
  })
  .step({
    target: "#react-tour-id-3",
    title: "React step",
    content: "This step targets a real React-rendered element.",
    behavior: {
      allowInteraction: false,
    },
  })
  .finish();

function ReactPlayground() {
  return (
    <main className="app-screen">
      <a className="back-link" href="/">
        Playground
      </a>
      <section className="app-panel">
        <h1>React app</h1>
        <button type="button" onClick={() => glowTour.run(tour)}>
          Start tour
        </button>
        <span id="react-tour-id-1" className="target-pill">
          Step 1
        </span>
        <span id="react-tour-id-2" className="target-pill">
          Step 2
        </span>
        <button type="button" id="react-tour-id-3" className="target-button target-shrink">
          Step 3
        </button>

        <GlowTour.Root>
          <GlowTour.Overlay />
          <GlowTour.Popover>
            <GlowTour.Header />
            <GlowTour.Content />
            <GlowTour.Footer>
              <GlowTour.PreviousTrigger />
              <GlowTour.NextTrigger />
            </GlowTour.Footer>
          </GlowTour.Popover>
        </GlowTour.Root>
      </section>
    </main>
  );
}

const root = document.querySelector("#react-root");
if (!root) {
  throw new Error("Missing #react-root");
}

createRoot(root).render(<ReactPlayground />);
