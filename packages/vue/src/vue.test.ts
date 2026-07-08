import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createWorkflow, start } from "../../core/src";
import {
  createVueTutorialBridge,
  GlowTourContent,
  GlowTourFooter,
  GlowTourHeader,
  GlowTourNextTrigger,
  GlowTourOverlay,
  GlowTourPopover,
  GlowTourBackTrigger,
  GlowTourRoot,
  glowTour,
} from "./index";

describe("vue bridge", () => {
  test("exports the project public API", () => {
    assert.equal(typeof glowTour.create, "function");
    assert.equal(typeof glowTour.run, "function");
    assert.equal(typeof GlowTourRoot, "object");
    assert.equal(typeof GlowTourHeader, "object");
    assert.equal(typeof GlowTourContent, "object");
    assert.equal(typeof GlowTourFooter, "object");
    assert.equal(typeof GlowTourPopover, "object");
    assert.equal(typeof GlowTourOverlay, "object");
    assert.equal(typeof GlowTourBackTrigger, "object");
    assert.equal(typeof GlowTourNextTrigger, "object");
  });

  test("declares accessible Vue component defaults", () => {
    assert.equal(GlowTourRoot.name, "GlowTourRoot");
    assert.deepEqual(GlowTourHeader.props, {
      id: { default: "glow-tour-title", type: String },
    });
    assert.deepEqual(GlowTourContent.props, {
      ariaLive: { default: "polite", type: String },
      id: { default: "glow-tour-description", type: String },
    });
    assert.deepEqual(GlowTourPopover.props, {
      ariaDescribedby: { default: "glow-tour-description", type: String },
      ariaLabelledby: { default: "glow-tour-title", type: String },
      id: { default: "glow-tour-popover", type: String },
      role: { default: "dialog", type: String },
    });
    assert.deepEqual(GlowTourOverlay.props, {
      ariaHidden: { default: true, type: Boolean },
      focusable: { default: "false", type: String },
      viewBox: { default: "0 0 0 0", type: String },
    });
    assert.deepEqual(GlowTourBackTrigger.props, {
      ariaControls: { default: "glow-tour-popover", type: String },
      ariaLabel: { default: "Back step", type: String },
      ariaKeyshortcuts: { default: "ArrowLeft", type: String },
      backLabel: { default: "back", type: String },
    });
    assert.deepEqual(GlowTourNextTrigger.props, {
      ariaControls: { default: "glow-tour-popover", type: String },
      ariaLabel: { default: "Next step", type: String },
      ariaKeyshortcuts: { default: "Enter ArrowRight", type: String },
      finishLabel: { default: "finish", type: String },
      nextLabel: { default: "next", type: String },
    });
  });

  test("exposes a composable-ready workflow bridge", async () => {
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
      start("vue")
        .step({
          target: "#one",
          title: "One",
          content: "One",
        })
        .finish(),
    );
    const bridge = createVueTutorialBridge(workflow);

    await bridge.controls.start();
    assert.equal(bridge.getCurrentStep()?.target, "#one");
    assert.equal(bridge.getTargetElement(), target);
  });
});
