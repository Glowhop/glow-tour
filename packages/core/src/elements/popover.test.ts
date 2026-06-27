import assert from "node:assert/strict";
import { describe, test } from "node:test";
import PopoverElement from "./popover";

class FakeElement extends EventTarget {
  style: Record<string, string> = {};

  getBoundingClientRect() {
    return {
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
    } as DOMRect;
  }
}

function installWindow(size: { width: number; height: number; devicePixelRatio?: number }) {
  Object.defineProperty(globalThis, "window", {
    value: {
      innerWidth: size.width,
      innerHeight: size.height,
      devicePixelRatio: size.devicePixelRatio,
    },
    configurable: true,
    writable: true,
  });
}

describe("PopoverElement", () => {
  test("_getNextPosition returns x and y coordinates for transforms", () => {
    installWindow({ width: 300, height: 200 });

    class SizedFakeElement extends FakeElement {
      override getBoundingClientRect() {
        return {
          left: 0,
          top: 0,
          right: 120,
          bottom: 80,
          width: 120,
          height: 80,
        } as DOMRect;
      }
    }

    const popover = new SizedFakeElement() as unknown as HTMLElement;
    const element = new PopoverElement(popover);

    const nextPosition = (
      element as unknown as {
        _getNextPosition: (
          position: DOMRect,
          tryOrder: ("top" | "bottom" | "left" | "right")[],
        ) => { x: number; y: number };
      }
    )._getNextPosition(
      {
        left: 50,
        top: 150,
        right: 150,
        bottom: 170,
        width: 100,
        height: 20,
      } as DOMRect,
      ["bottom", "top"],
    );

    assert.deepEqual(nextPosition, { x: 50, y: 56 });
  });

  test("tries positions in order until one fits in the viewport", () => {
    installWindow({ width: 300, height: 200 });

    class SizedFakeElement extends FakeElement {
      override getBoundingClientRect() {
        return {
          left: 0,
          top: 0,
          right: 120,
          bottom: 80,
          width: 120,
          height: 80,
        } as DOMRect;
      }
    }

    const popover = new SizedFakeElement() as unknown as HTMLElement;
    const element = new PopoverElement(popover);

    const keyframe = (
      element as unknown as {
        _getNextkeyframe: (
          position: DOMRect,
          tryOrder: ("top" | "bottom" | "left" | "right")[],
        ) => Keyframe;
      }
    )._getNextkeyframe(
      {
        left: 50,
        top: 150,
        right: 150,
        bottom: 170,
        width: 100,
        height: 20,
      } as DOMRect,
      ["bottom", "top"],
    );

    assert.equal(keyframe.transform, "translate(50px, 56px)");
  });

  test("centers the popover when no placement fully fits", () => {
    installWindow({ width: 300, height: 200 });

    class LargeFakeElement extends FakeElement {
      override getBoundingClientRect() {
        return {
          left: 0,
          top: 0,
          right: 320,
          bottom: 220,
          width: 320,
          height: 220,
        } as DOMRect;
      }
    }

    const popover = new LargeFakeElement() as unknown as HTMLElement;
    const element = new PopoverElement(popover);

    const keyframe = (
      element as unknown as {
        _getNextkeyframe: (
          position: DOMRect,
          tryOrder: ("top" | "bottom" | "left" | "right")[],
        ) => Keyframe;
      }
    )._getNextkeyframe(
      {
        left: 120,
        top: 60,
        right: 180,
        bottom: 120,
        width: 60,
        height: 60,
      } as DOMRect,
      ["top", "bottom", "left", "right"],
    );

    assert.equal(keyframe.transform, "translate(-10px, -10px)");
  });

  test("rounds translated coordinates using device pixel ratio", () => {
    installWindow({ width: 300, height: 200, devicePixelRatio: 2 });

    class FractionalFakeElement extends FakeElement {
      override getBoundingClientRect() {
        return {
          left: 0,
          top: 0,
          right: 99.5,
          bottom: 80.25,
          width: 99.5,
          height: 80.25,
        } as DOMRect;
      }
    }

    const popover = new FractionalFakeElement() as unknown as HTMLElement;
    const element = new PopoverElement(popover);

    const keyframe = (
      element as unknown as {
        _getNextkeyframe: (
          position: DOMRect,
          tryOrder: ("top" | "bottom" | "left" | "right")[],
        ) => Keyframe;
      }
    )._getNextkeyframe(
      {
        left: 50.25,
        top: 25.25,
        right: 150.75,
        bottom: 45.25,
        width: 100.5,
        height: 20,
      } as DOMRect,
      ["bottom"],
    );

    assert.equal(keyframe.transform, "translate(50.5px, 59.5px)");
  });
});
