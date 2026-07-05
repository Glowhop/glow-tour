import "@angular/compiler";
import "zone.js";
import { Component } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import {
  GlowTourContent,
  GlowTourFooter,
  GlowTourHeader,
  GlowTourNextTrigger,
  GlowTourOverlay,
  GlowTourPopover,
  GlowTourPreviousTrigger,
  GlowTourRoot,
} from "@glowhop/angular-tour";
import { glowTour } from "@glowhop/core-tour";
import "@glowhop/styles-tour/default.css";
import "../src/styles.css";

const tour = glowTour
  .create("angular-playground", {
    overlay: { color: "#101820", opacity: 0.58, padding: 10, radius: 8 },
  })
  .step({
    target: "#angular-tour-id",
    title: "Angular step",
    content: "This step targets a real Angular-rendered element.",
  })
  .finish();

@Component({
  selector: "angular-playground",
  standalone: true,
  imports: [
    GlowTourRoot,
    GlowTourOverlay,
    GlowTourPopover,
    GlowTourHeader,
    GlowTourContent,
    GlowTourFooter,
    GlowTourPreviousTrigger,
    GlowTourNextTrigger,
  ],
  template: `
    <main class="app-screen bg-lime-50/40">
      <a class="back-link inline-flex items-center gap-2 text-emerald-700" href="/">Playground</a>
      <section class="app-panel shadow-sm ring-1 ring-black/5">
        <h1 class="text-3xl font-semibold tracking-tight">Angular app</h1>
        <button class="w-fit" type="button" (click)="startTour()">Start tour</button>
        <span id="angular-tour-id" class="target-pill">AHHH</span>

        <GlowTourRoot>
          <GlowTourOverlay />
          <GlowTourPopover>
            <GlowTourHeader />
            <GlowTourContent />
            <GlowTourFooter>
              <GlowTourPreviousTrigger previousLabel="prev" />
              <GlowTourNextTrigger finishLabel="finish" nextLabel="next" />
            </GlowTourFooter>
          </GlowTourPopover>
        </GlowTourRoot>
      </section>
    </main>
  `,
})
class AngularPlayground {
  startTour() {
    void glowTour.run(tour);
  }
}

bootstrapApplication(AngularPlayground).catch((error: unknown) => {
  const fallback = document.createElement("pre");
  fallback.className = "app-panel";
  fallback.textContent = error instanceof Error ? error.message : String(error);
  document.body.appendChild(fallback);
  console.error(error);
});
