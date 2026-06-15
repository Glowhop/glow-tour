import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createWorkflow, start } from "../../core/src";
import {
  GLOW_TOUR_COMPONENT_TEMPLATES,
  GlowTourContent,
  GlowTourFooter,
  GlowTourHeader,
  GlowTourNextTrigger,
  GlowTourOverlay,
  GlowTourPopover,
  GlowTourPreviousTrigger,
  GlowTourRoot,
  TutorialService,
} from "./public-api";

describe("angular bridge", () => {
  test("exports the project public API", () => {
    assert.equal(typeof TutorialService, "function");
    assert.equal(typeof GlowTourRoot, "function");
    assert.equal(typeof GlowTourHeader, "function");
    assert.equal(typeof GlowTourContent, "function");
    assert.equal(typeof GlowTourFooter, "function");
    assert.equal(typeof GlowTourPopover, "function");
    assert.equal(typeof GlowTourOverlay, "function");
    assert.equal(typeof GlowTourPreviousTrigger, "function");
    assert.equal(typeof GlowTourNextTrigger, "function");
  });

  test("declares accessible Angular component metadata", () => {
    assert.match(GLOW_TOUR_COMPONENT_TEMPLATES.root, /data-glow-tour-root/);
    assert.match(GLOW_TOUR_COMPONENT_TEMPLATES.header, /id="glow-tour-title"/);
    assert.match(GLOW_TOUR_COMPONENT_TEMPLATES.content, /id="glow-tour-description"/);
    assert.match(GLOW_TOUR_COMPONENT_TEMPLATES.content, /aria-live="polite"/);
    assert.match(GLOW_TOUR_COMPONENT_TEMPLATES.popover, /role="dialog"/);
    assert.match(GLOW_TOUR_COMPONENT_TEMPLATES.popover, /id="glow-tour-popover"/);
    assert.match(GLOW_TOUR_COMPONENT_TEMPLATES.popover, /aria-labelledby="glow-tour-title"/);
    assert.match(GLOW_TOUR_COMPONENT_TEMPLATES.popover, /aria-describedby="glow-tour-description"/);
    assert.match(GLOW_TOUR_COMPONENT_TEMPLATES.popover, /data-glow-tour-popover/);
    assert.match(GLOW_TOUR_COMPONENT_TEMPLATES.overlay, /<svg/);
    assert.match(GLOW_TOUR_COMPONENT_TEMPLATES.overlay, /aria-hidden="true"/);
    assert.match(GLOW_TOUR_COMPONENT_TEMPLATES.overlay, /role="presentation"/);
    assert.match(GLOW_TOUR_COMPONENT_TEMPLATES.overlay, /focusable="false"/);
    assert.match(GLOW_TOUR_COMPONENT_TEMPLATES.overlay, /data-glow-tour-overlay/);
    assert.match(GLOW_TOUR_COMPONENT_TEMPLATES.overlay, /<path/);
    assert.match(GLOW_TOUR_COMPONENT_TEMPLATES.overlay, /data-glow-tour-overlay-path/);
    assert.match(GLOW_TOUR_COMPONENT_TEMPLATES.previousTrigger, /type="button"/);
    assert.match(GLOW_TOUR_COMPONENT_TEMPLATES.previousTrigger, /aria-label="Previous step"/);
    assert.match(GLOW_TOUR_COMPONENT_TEMPLATES.previousTrigger, /aria-keyshortcuts="ArrowLeft"/);
    assert.match(
      GLOW_TOUR_COMPONENT_TEMPLATES.previousTrigger,
      /aria-controls="glow-tour-popover"/,
    );
    assert.match(GLOW_TOUR_COMPONENT_TEMPLATES.previousTrigger, /data-glow-tour-previous-trigger/);
    assert.match(GLOW_TOUR_COMPONENT_TEMPLATES.previousTrigger, /previousLabel/);
    assert.match(GLOW_TOUR_COMPONENT_TEMPLATES.nextTrigger, /type="button"/);
    assert.match(GLOW_TOUR_COMPONENT_TEMPLATES.nextTrigger, /aria-label="Next step"/);
    assert.match(GLOW_TOUR_COMPONENT_TEMPLATES.nextTrigger, /aria-keyshortcuts="Enter ArrowRight"/);
    assert.match(GLOW_TOUR_COMPONENT_TEMPLATES.nextTrigger, /aria-controls="glow-tour-popover"/);
    assert.match(GLOW_TOUR_COMPONENT_TEMPLATES.nextTrigger, /data-glow-tour-next-trigger/);
    assert.match(GLOW_TOUR_COMPONENT_TEMPLATES.nextTrigger, /label/);
  });

  test("wraps the workflow instance in a service-shaped API", async () => {
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
      start("angular")
        .step({
          target: "#one",
          title: "One",
          content: "One",
        })
        .finish(),
    );
    const service = new TutorialService(workflow);

    await service.start();
    assert.equal(service.currentStep?.target, "#one");
    assert.equal(service.targetElement, target);
  });
});
