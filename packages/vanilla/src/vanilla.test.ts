import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createWorkflow, start } from "../../core/src";
import {
  createVanillaRenderer,
  createVanillaTutorialController,
  GLOW_TOUR_ELEMENT_NAMES,
  registerGlowTourElements,
} from "./index";

describe("vanilla bridge", () => {
  test("registers vanilla-owned web components", () => {
    const defined: string[] = [];
    const constructors = new Map<string, CustomElementConstructor>();

    Object.defineProperty(globalThis, "HTMLElement", {
      value: class {
        private readonly attributes = new Map<string, string>();
        readonly children: unknown[] = [];

        setAttribute(name: string, value: string) {
          this.attributes.set(name, value);
        }

        hasAttribute(name: string) {
          return this.attributes.has(name);
        }

        appendChild(child: unknown) {
          this.children.push(child);
          return child;
        }

        querySelector(selector: string) {
          return selector === "[data-glow-tour-overlay-path]"
            ? (this.children.find((child) => Reflect.get(child as object, "isOverlayPath")) ?? null)
            : null;
        }
      },
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "document", {
      value: {
        createElementNS(_namespace: string, tagName: string) {
          return {
            children: [] as unknown[],
            isOverlayPath: tagName === "path",
            appendChild(child: unknown) {
              this.children.push(child);
              return child;
            },
            setAttribute() {},
          };
        },
      },
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "customElements", {
      value: {
        get(name: string) {
          return defined.includes(name) ? class {} : undefined;
        },
        define(name: string, elementConstructor: CustomElementConstructor) {
          defined.push(name);
          constructors.set(name, elementConstructor);
        },
      },
      configurable: true,
      writable: true,
    });

    registerGlowTourElements();

    assert.deepEqual(defined, GLOW_TOUR_ELEMENT_NAMES);

    const OverlayElement = constructors.get("glow-tour-overlay");
    assert.equal(typeof OverlayElement, "function");
    if (!OverlayElement) {
      throw new Error("Missing glow-tour-overlay constructor");
    }
    const overlay = new OverlayElement() as HTMLElement & {
      children: unknown[];
      connectedCallback(): void;
    };
    overlay.connectedCallback();
    assert.equal(overlay.children.length, 1);
  });

  test("renders workflow state into a DOM container", async () => {
    const body = {
      children: [] as unknown[],
      appendChild(child: unknown) {
        this.children.push(child);
        return child;
      },
      removeChild(child: unknown) {
        this.children = this.children.filter((current) => current !== child);
      },
    };
    const container = {
      innerHTML: "",
    } as HTMLElement;
    const target = new EventTarget() as HTMLElement;

    Object.defineProperty(globalThis, "document", {
      value: {
        body,
        querySelector(value: string) {
          return value === "#one" ? target : null;
        },
        createElementNS() {
          return {
            children: [] as unknown[],
            style: {},
            setAttribute() {},
            appendChild(child: unknown) {
              this.children.push(child);
              return child;
            },
            remove() {
              body.removeChild(this);
            },
          };
        },
        addEventListener() {},
        removeEventListener() {},
      },
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "window", {
      value: {
        innerWidth: 1000,
        innerHeight: 600,
        addEventListener() {},
        removeEventListener() {},
        requestAnimationFrame(callback: FrameRequestCallback) {
          callback(16);
          return 1;
        },
        cancelAnimationFrame() {},
      },
      configurable: true,
      writable: true,
    });

    const workflow = createWorkflow(
      start("vanilla")
        .step({
          target: "#one",
          title: "One",
          content: "One",
        })
        .finish(),
    );

    const controller = createVanillaTutorialController(workflow, createVanillaRenderer(container));
    await controller.start();

    assert.match(container.innerHTML, /<h2>One<\/h2>/);
    controller.destroy();
    assert.equal(container.innerHTML, "");
    assert.equal(body.children.length, 0);
  });

  test("renders text content payloads without i18n logic", async () => {
    const container = {
      innerHTML: "",
    } as HTMLElement;
    const target = new EventTarget() as HTMLElement;

    Object.defineProperty(globalThis, "document", {
      value: {
        querySelector(value: string) {
          return value === "#text-step" ? target : null;
        },
        addEventListener() {},
        removeEventListener() {},
      },
      configurable: true,
      writable: true,
    });

    const workflow = createWorkflow(
      start("vanilla-text")
        .step({
          target: "#text-step",
          title: {
            kind: "text",
            text: "Structured title",
          },
          content: {
            kind: "text",
            text: "Structured content",
          },
        })
        .finish(),
    );

    const controller = createVanillaTutorialController(workflow, createVanillaRenderer(container));
    await controller.start();

    assert.match(container.innerHTML, /Structured title/);
    assert.match(container.innerHTML, /Structured content/);
  });

  test("uses renderer props for fallback buttons", async () => {
    const container = {
      innerHTML: "",
    } as HTMLElement;
    const target = new EventTarget() as HTMLElement;

    Object.defineProperty(globalThis, "document", {
      value: {
        querySelector(value: string) {
          return value === "#labels" ? target : null;
        },
        addEventListener() {},
        removeEventListener() {},
      },
      configurable: true,
      writable: true,
    });

    const workflow = createWorkflow(
      start("vanilla-labels")
        .step({
          target: "#labels",
          title: "Labels",
          content: "Labels",
        })
        .finish(),
    );

    const controller = createVanillaTutorialController(
      workflow,
      createVanillaRenderer(container, {
        nextLabel: "continue",
        backLabel: "back",
      }),
    );
    await controller.start();

    assert.match(container.innerHTML, />back<\/button>/);
    assert.match(container.innerHTML, />continue<\/button>/);

    await workflow.next();
    assert.equal(container.innerHTML, "");
  });

  test("hides the cancel action when cancellation is disabled", async () => {
    const container = {
      innerHTML: "",
    } as HTMLElement;
    const target = new EventTarget() as HTMLElement;

    Object.defineProperty(globalThis, "document", {
      value: {
        querySelector(value: string) {
          return value === "#locked" ? target : null;
        },
        addEventListener() {},
        removeEventListener() {},
      },
      configurable: true,
      writable: true,
    });

    const workflow = createWorkflow(
      start("vanilla-locked", {
        cancellable: false,
      })
        .step({
          target: "#locked",
          title: "Locked",
          content: "Locked",
        })
        .finish(),
    );

    const controller = createVanillaTutorialController(workflow, createVanillaRenderer(container));
    await controller.start();

    assert.equal(container.innerHTML.includes('data-action="cancel"'), false);
  });
});
