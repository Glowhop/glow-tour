import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createWorkflow, start } from "../../core/src";
import { createReactTutorialBridge, GlowTour, glowTour } from "./index";

describe("react bridge", () => {
  test("exports the project public API", () => {
    assert.equal(typeof glowTour.create, "function");
    assert.equal(typeof glowTour.run, "function");
    assert.equal(typeof GlowTour.Root, "function");
    assert.equal(typeof GlowTour.Header, "function");
    assert.equal(typeof GlowTour.Content, "function");
    assert.equal(typeof GlowTour.Footer, "function");
    assert.equal(typeof GlowTour.Popover, "function");
    assert.equal(typeof GlowTour.Overlay, "function");
    assert.equal(typeof GlowTour.PreviousTrigger, "function");
    assert.equal(typeof GlowTour.NextTrigger, "function");
  });

  test("declares accessible React component defaults", () => {
    assert.equal("data-glow-tour-root" in GlowTour.Root({}).props, true);
    assert.equal(GlowTour.Popover({}).props.role, "dialog");
    assert.equal(GlowTour.Popover({}).props.id, "glow-tour-popover");
    assert.equal(GlowTour.Popover({}).props["aria-labelledby"], "glow-tour-title");
    assert.equal(GlowTour.Popover({}).props["aria-describedby"], "glow-tour-description");
    assert.equal("data-glow-tour-popover" in GlowTour.Popover({}).props, true);
    assert.equal(GlowTour.Header({}).props.id, "glow-tour-title");
    assert.equal(GlowTour.Content({}).props.id, "glow-tour-description");
    assert.equal(GlowTour.Content({}).props["aria-live"], "polite");
    assert.equal(GlowTour.Overlay({}).type, "svg");
    assert.equal(GlowTour.Overlay({}).props["aria-hidden"], true);
    assert.equal("data-glow-tour-overlay" in GlowTour.Overlay({}).props, true);
    assert.equal(GlowTour.Overlay({}).props.focusable, "false");
    assert.equal(GlowTour.Overlay({}).props.role, "presentation");
    const [path] = GlowTour.Overlay({}).props.children;
    assert.equal(path.type, "path");
    assert.equal("data-glow-tour-overlay-path" in path.props, true);
    assert.equal(GlowTour.PreviousTrigger({}).props.type, "button");
    assert.equal(GlowTour.PreviousTrigger({}).props["aria-label"], "Previous step");
    assert.equal(GlowTour.PreviousTrigger({}).props["aria-keyshortcuts"], "ArrowLeft");
    assert.equal(GlowTour.PreviousTrigger({}).props["aria-controls"], "glow-tour-popover");
    assert.equal(GlowTour.PreviousTrigger({ previousLabel: "back" }).props.children, "back");
    assert.equal("data-glow-tour-previous-trigger" in GlowTour.PreviousTrigger({}).props, true);
    assert.equal(GlowTour.NextTrigger({}).props.type, "button");
    assert.equal(GlowTour.NextTrigger({}).props["aria-label"], "Next step");
    assert.equal(GlowTour.NextTrigger({}).props["aria-keyshortcuts"], "Enter ArrowRight");
    assert.equal(GlowTour.NextTrigger({}).props["aria-controls"], "glow-tour-popover");
    assert.equal(GlowTour.NextTrigger({ nextLabel: "continue" }).props.children, "continue");
    assert.equal("data-glow-tour-next-trigger" in GlowTour.NextTrigger({}).props, true);
  });

  test("registers React component refs in the core store", () => {
    const popover = {
      hidden: false,
      style: {},
      setAttribute() {},
      toggleAttribute() {},
    } as unknown as HTMLElement;
    const element = GlowTour.Popover({}) as ReturnType<typeof GlowTour.Popover> & {
      ref: (element: HTMLElement | null) => void;
    };

    element.ref(popover);
    assert.equal(glowTour.state.getElement("popover"), popover);

    element.ref(null);
    assert.equal(glowTour.state.getElement("popover"), null);
  });

  test("exposes external-store compatible bindings", async () => {
    const target = {} as HTMLElement;
    Object.defineProperty(globalThis, "document", {
      value: {
        querySelector(value: string) {
          return value === "#one" ? target : null;
        },
        addEventListener() {},
        removeEventListener() {},
      },
      configurable: true,
      writable: true,
    });

    const workflow = createWorkflow(
      start("react")
        .step({
          target: "#one",
          title: "One",
          content: "One",
        })
        .finish(),
    );

    const bridge = createReactTutorialBridge(workflow);
    await bridge.controls.start();

    assert.equal(bridge.getSnapshot().step?.target, "#one");
    assert.equal(bridge.getTargetElement(), target);
  });
});
