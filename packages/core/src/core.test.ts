import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { Observable } from "@glowhop/observables";
import { createTourStore, glowTour, type TextContent, type WorkflowDefinition } from "./index";

class FakeElement extends EventTarget {
  attributes = new Map<string, string>();
  clicked = 0;
  focused = 0;
  className = "";
  disabled = false;
  hidden = false;
  innerHTML = "";
  textContent: string | null = null;
  tagName = "";
  children: unknown[] = [];
  style: Record<string, string> = {};
  classList = {
    add() {},
    remove() {},
    contains() {
      return false;
    },
  };

  appendChild(child: unknown) {
    this.children.push(child);
    return child as Node;
  }

  querySelector(selector?: string) {
    if (selector === "[data-glow-tour-overlay-path]") {
      return (
        this.children.find(
          (child) =>
            child instanceof FakeElement &&
            child.getAttribute("data-glow-tour-overlay-path") !== null,
        ) ?? null
      );
    }

    return new FakeElement() as unknown as HTMLElement;
  }

  setAttribute(name: string, value = "") {
    this.attributes.set(name, value);
  }

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }

  hasAttribute(name: string) {
    return this.attributes.has(name);
  }

  removeAttribute(name: string) {
    this.attributes.delete(name);
  }

  toggleAttribute(name: string, force?: boolean) {
    const shouldSet = force ?? !this.attributes.has(name);
    if (shouldSet) {
      this.attributes.set(name, "");
      return true;
    }

    this.attributes.delete(name);
    return false;
  }

  click() {
    this.clicked += 1;
    this.dispatchEvent(new Event("click"));
  }

  focus() {
    this.focused += 1;
  }

  getBoundingClientRect() {
    return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 } as DOMRect;
  }

  remove() {}
}

function installDocument(elements: Record<string, HTMLElement | null>) {
  const documentStub = {
    body: new FakeElement(),
    querySelector<T extends HTMLElement>(value: string) {
      return (elements[value] ?? null) as T | null;
    },
    createElement(_tagName: string) {
      return new FakeElement() as unknown as HTMLElement & { tagName: string };
    },
    createElementNS(_namespace: string, _tagName: string) {
      return new FakeElement() as unknown as SVGElement & { tagName: string };
    },
    addEventListener() {},
    removeEventListener() {},
  };

  Object.defineProperty(globalThis, "document", {
    value: documentStub,
    configurable: true,
    writable: true,
  });
}

function installMountDocument(elements: Record<string, HTMLElement | null>) {
  const appended: string[] = [];
  const mountedChildren = new Set<object>();
  class FakeMountElement extends EventTarget {
    className = "";
    hidden = false;
    innerHTML = "";
    textContent: string | null = null;
    disabled = false;
    tagName: string;
    children: unknown[] = [];
    style: Record<string, string> = {};
    classList = {
      add() {},
      remove() {},
      contains() {
        return false;
      },
    };

    constructor(tagName: string) {
      super();
      this.tagName = tagName;
    }

    appendChild(child: unknown) {
      this.children.push(child);
      return child as Node;
    }

    querySelector() {
      return new FakeMountElement("span");
    }

    setAttribute() {}

    getBoundingClientRect() {
      return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 } as DOMRect;
    }

    remove() {}
  }

  const body = {
    appendChild(child: { tagName?: string }) {
      if (typeof child === "object" && child && !mountedChildren.has(child)) {
        mountedChildren.add(child);
        appended.push(child.tagName ?? "");
      }
      return child;
    },
  };
  const documentStub = {
    body,
    appended,
    querySelector<T extends HTMLElement>(value: string) {
      return (elements[value] ?? null) as T | null;
    },
    createElement(tagName: string) {
      return new FakeMountElement(tagName) as unknown as HTMLElement & { tagName: string };
    },
    createElementNS(_namespace: string, tagName: string) {
      return new FakeMountElement(tagName) as unknown as SVGElement & { tagName: string };
    },
    addEventListener() {},
    removeEventListener() {},
  };

  Object.defineProperty(globalThis, "document", {
    value: documentStub,
    configurable: true,
    writable: true,
  });

  return documentStub;
}

describe("glowTour builder", () => {
  test("creates a workflow with target-only steps and step-level options", () => {
    const title: TextContent = {
      kind: "text",
      text: "Profile card",
      meta: { section: "profile" },
    };

    const workflow = glowTour
      .create("tour.onboarding", {
        overlay: { color: "red" },
      })
      .step({
        target: "#profile-card",
        title,
        content: "Profile content",
        overlay: { color: "blue", opacity: 0.7, padding: 12, radius: 8 },
        popover: { placementTryOrder: ["bottom", "top"] },
        animation: { duration: 250, easing: "ease-out" },
        behavior: { missingTargetStrategy: "wait", targetTimeout: 3000 },
      })
      .clickTarget()
      .finish();

    assert.equal(workflow.name, "tour.onboarding");
    assert.equal(workflow.steps.length, 1);
    assert.equal("id" in workflow.steps[0]!, false);
    assert.equal(workflow.steps[0]?.target, "#profile-card");
    assert.equal(workflow.steps[0]?.presentation.title, title);
    assert.equal(workflow.steps[0]?.overlay?.color, "blue");
    assert.equal(workflow.steps[0]?.popover?.placementTryOrder?.[0], "bottom");
    assert.equal(workflow.steps[0]?.animation?.duration, 250);
    assert.equal(workflow.steps[0]?.behavior?.missingTargetStrategy, "wait");
    assert.equal(workflow.steps[0]?.actions.length, 1);
  });
});

describe("glowTour store", () => {
  test("uses @glowhop/observables for dynamic state", () => {
    const store = createTourStore();

    assert.equal(store.status instanceof Observable, true);
    assert.equal(store.currentStepIndex instanceof Observable, true);
    assert.equal(store.currentStep instanceof Observable, true);
    assert.equal(store.direction instanceof Observable, true);
    assert.equal(store.canGoNext instanceof Observable, true);
    assert.equal(store.canGoPrevious instanceof Observable, true);
    assert.equal(store.isFirstStep instanceof Observable, true);
    assert.equal(store.isLastStep instanceof Observable, true);
  });

  test("registers and unregisters tour component elements", () => {
    const store = createTourStore();
    const popover = new FakeElement() as unknown as HTMLElement;

    store.registerElement("popover", popover);
    assert.equal(store.getElement("popover"), popover);

    store.registerElement("popover", null);
    assert.equal(store.getElement("popover"), null);
  });

  test("syncs registered tour elements when a workflow runs", async () => {
    const target = new FakeElement() as unknown as HTMLElement;
    installDocument({ "#target": target });
    const store = createTourStore();
    const header = new FakeElement() as unknown as HTMLElement;
    const content = new FakeElement() as unknown as HTMLElement;
    const popover = new FakeElement() as unknown as HTMLElement;
    const previous = new FakeElement() as unknown as HTMLButtonElement;
    const next = new FakeElement() as unknown as HTMLButtonElement;
    const overlay = new FakeElement() as unknown as SVGSVGElement;
    const overlayPath = new FakeElement() as unknown as SVGPathElement;
    overlayPath.setAttribute("data-glow-tour-overlay-path", "");
    overlay.appendChild(overlayPath);

    store.registerElement("header", header);
    store.registerElement("content", content);
    store.registerElement("popover", popover);
    store.registerElement("previous-trigger", previous);
    store.registerElement("next-trigger", next);
    store.registerElement("overlay", overlay);

    const workflow = glowTour
      .create("registered")
      .step({
        target: "#target",
        title: "Registered title",
        content: "Registered content",
      })
      .finish();

    await store.start(workflow);

    assert.equal(header.textContent, "Registered title");
    assert.equal(content.textContent, "Registered content");
    assert.equal(popover.hidden, false);
    assert.equal(popover.getAttribute("data-glow-tour-status"), "running");
    assert.equal(popover.hasAttribute("data-glow-tour-animated"), true);
    assert.equal(next.hasAttribute("data-glow-tour-last-step"), true);
    assert.equal(overlay.hasAttribute("hidden"), false);
    assert.equal(previous.disabled, true);
    assert.notEqual(overlayPath.getAttribute("d"), null);

    next.click();

    assert.equal(store.get().status, "finished");
    assert.equal(popover.hidden, true);
    assert.equal(overlay.hasAttribute("hidden"), true);
  });

  test("runs a workflow through glowTour.run and exposes state snapshots", async () => {
    const target = new FakeElement() as unknown as HTMLElement;
    installDocument({ "#start": target });

    let started = 0;
    let cancelled = 0;
    let finished = 0;

    const workflow = glowTour
      .create("tour.flow", {
        onStart: () => {
          started += 1;
        },
        onCancel: () => {
          cancelled += 1;
        },
        onFinish: () => {
          finished += 1;
        },
      })
      .step({
        target: "#start",
        title: "Start",
        content: "Content",
      })
      .clickTarget()
      .finish();

    await glowTour.run(workflow);

    assert.equal(started, 1);
    assert.equal(glowTour.state.get().status, "running");
    assert.equal(glowTour.state.get().currentStepIndex, 0);
    assert.equal(glowTour.state.get().currentStep?.target, "#start");
    assert.equal(glowTour.state.get().isFirstStep, true);
    assert.equal(glowTour.state.get().isLastStep, true);
    assert.equal((target as unknown as FakeElement).clicked, 1);

    await glowTour.state.next();

    assert.equal(finished, 1);
    assert.equal(glowTour.state.get().status, "finished");

    await glowTour.run(workflow);
    await glowTour.state.cancel();

    assert.equal(cancelled, 1);
    assert.equal(glowTour.state.get().status, "cancelled");
  });

  test("keeps a workflow running when cancellation is disabled", async () => {
    const target = new FakeElement() as unknown as HTMLElement;
    installDocument({ "#locked": target });
    const store = createTourStore();
    let cancelled = 0;
    let cancelActionRuns = 0;

    const workflow = glowTour
      .create("locked", {
        cancellable: false,
        onCancel: () => {
          cancelled += 1;
        },
      })
      .step({
        target: "#locked",
        title: "Locked",
        content: "Locked",
      })
      .onCancel(() => {
        cancelActionRuns += 1;
      })
      .finish();

    await store.start(workflow);
    await store.cancel();

    assert.equal(store.get().status, "running");
    assert.equal(store.get().currentStep?.target, "#locked");
    assert.equal(cancelled, 0);
    assert.equal(cancelActionRuns, 0);
  });

  test("waits for missing targets and then reports an error by default", async () => {
    installDocument({});
    const store = createTourStore();
    const workflow: WorkflowDefinition = {
      name: "missing",
      options: {},
      steps: [
        {
          target: "#missing",
          presentation: { title: "Missing", content: "Missing" },
          behavior: { missingTargetStrategy: "wait", targetTimeout: 1 },
          actions: [],
          eventHandlers: [],
          nextAction: null,
          previousAction: null,
          cancelAction: null,
        },
      ],
    };

    await store.start(workflow);

    assert.equal(store.get().status, "error");
    assert.match(store.get().error?.message ?? "", /Missing target/);
  });

  test("skips missing targets when the strategy is skip", async () => {
    const target = new FakeElement() as unknown as HTMLElement;
    installDocument({ "#second": target });
    const store = createTourStore();
    const workflow = glowTour
      .create("skip-missing")
      .step({
        target: "#missing",
        title: "Missing",
        content: "Missing",
        behavior: { missingTargetStrategy: "skip" },
      })
      .step({
        target: "#second",
        title: "Second",
        content: "Second",
      })
      .finish();

    await store.start(workflow);

    assert.equal(store.get().status, "running");
    assert.equal(store.get().currentStepIndex, 1);
    assert.equal(store.get().currentStep?.target, "#second");
  });

  test("does not mount UI elements when glowTour.run starts", async () => {
    const target = new FakeElement() as unknown as HTMLElement;
    const documentStub = installMountDocument({ "#mounted": target });
    const workflow = glowTour
      .create("mount")
      .step({
        target: "#mounted",
        title: "Mounted",
        content: "Mounted",
      })
      .finish();

    await glowTour.run(workflow);

    assert.deepEqual(documentStub.appended, []);
  });
});
