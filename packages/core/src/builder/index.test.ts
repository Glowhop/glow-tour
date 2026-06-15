import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { glowTour } from "../index";

describe("builder actions", () => {
  test("supports action and event registration on target-only steps", () => {
    const workflow = glowTour
      .create("aliases")
      .step({
        target: "#one",
        title: "One",
        content: "One",
      })
      .action(() => true)
      .on("click", () => {})
      .finish();

    assert.equal(workflow.steps[0]?.actions.length, 1);
    assert.equal(workflow.steps[0]?.eventHandlers.length, 1);
    assert.equal(workflow.steps[0]?.target, "#one");
  });

  test("stores step-level overlay popover scroll animation and behavior options", () => {
    const workflow = glowTour
      .create("options")
      .step({
        target: "#one",
        title: "One",
        content: "One",
        overlay: {
          color: "#000000",
          opacity: 0.6,
          padding: 20,
          radius: 12,
        },
        popover: {
          placementTryOrder: ["top", "bottom"],
        },
        scroll: {
          behavior: "smooth",
          block: "center",
        },
        animation: {
          duration: 200,
          easing: "ease-in-out",
        },
        behavior: {
          missingTargetStrategy: "error",
        },
      })
      .finish();

    assert.deepEqual(workflow.steps[0]?.overlay, {
      color: "#000000",
      opacity: 0.6,
      padding: 20,
      radius: 12,
    });
    assert.deepEqual(workflow.steps[0]?.popover, {
      placementTryOrder: ["top", "bottom"],
    });
    assert.deepEqual(workflow.steps[0]?.scroll, {
      behavior: "smooth",
      block: "center",
    });
    assert.deepEqual(workflow.steps[0]?.animation, {
      duration: 200,
      easing: "ease-in-out",
    });
    assert.deepEqual(workflow.steps[0]?.behavior, {
      missingTargetStrategy: "error",
    });
  });
});
