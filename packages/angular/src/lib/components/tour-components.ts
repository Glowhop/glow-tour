import { Component, type ElementRef, Input, ViewChild } from "@angular/core";
import { type GlowTourElementName, glowTour } from "../../../../core/src";

export const GLOW_TOUR_COMPONENT_TEMPLATES = {
  root: "<section #tourElement data-glow-tour-root><ng-content /></section>",
  header: '<header #tourElement data-glow-tour-header id="glow-tour-title"><ng-content /></header>',
  content:
    '<div #tourElement data-glow-tour-content id="glow-tour-description" aria-live="polite"><ng-content /></div>',
  footer: "<footer #tourElement data-glow-tour-footer><ng-content /></footer>",
  popover:
    '<section #tourElement data-glow-tour-popover id="glow-tour-popover" role="dialog" aria-labelledby="glow-tour-title" aria-describedby="glow-tour-description"><ng-content /></section>',
  overlay:
    '<svg #tourElement data-glow-tour-overlay aria-hidden="true" role="presentation" focusable="false" viewBox="0 0 0 0"><path data-glow-tour-overlay-path fill-rule="evenodd" /><ng-content /></svg>',
  previousTrigger:
    '<button #tourElement type="button" data-action="previous" data-glow-tour-previous-trigger aria-label="Previous step" aria-keyshortcuts="ArrowLeft" aria-controls="glow-tour-popover">{{ previousLabel }}</button>',
  nextTrigger:
    '<button #tourElement type="button" data-action="next" data-glow-tour-next-trigger aria-label="Next step" aria-keyshortcuts="Enter ArrowRight" aria-controls="glow-tour-popover">{{ label }}</button>',
} as const;

abstract class GlowTourElementComponent {
  @ViewChild("tourElement", { static: true })
  private readonly tourElement!: ElementRef<HTMLElement>;

  protected abstract readonly glowTourElementName: GlowTourElementName;

  ngAfterViewInit() {
    glowTour.state.registerElement(this.glowTourElementName, this.tourElement.nativeElement);
  }

  ngOnDestroy() {
    glowTour.state.registerElement(this.glowTourElementName, null);
  }
}

@Component({
  selector: "GlowTourRoot",
  standalone: true,
  template: GLOW_TOUR_COMPONENT_TEMPLATES.root,
})
export class GlowTourRoot extends GlowTourElementComponent {
  protected readonly glowTourElementName = "root";
}

@Component({
  selector: "GlowTourHeader",
  standalone: true,
  template: GLOW_TOUR_COMPONENT_TEMPLATES.header,
})
export class GlowTourHeader extends GlowTourElementComponent {
  protected readonly glowTourElementName = "header";
}

@Component({
  selector: "GlowTourContent",
  standalone: true,
  template: GLOW_TOUR_COMPONENT_TEMPLATES.content,
})
export class GlowTourContent extends GlowTourElementComponent {
  protected readonly glowTourElementName = "content";
}

@Component({
  selector: "GlowTourFooter",
  standalone: true,
  template: GLOW_TOUR_COMPONENT_TEMPLATES.footer,
})
export class GlowTourFooter extends GlowTourElementComponent {
  protected readonly glowTourElementName = "footer";
}

@Component({
  selector: "GlowTourPopover",
  standalone: true,
  template: GLOW_TOUR_COMPONENT_TEMPLATES.popover,
})
export class GlowTourPopover extends GlowTourElementComponent {
  protected readonly glowTourElementName = "popover";
}

@Component({
  selector: "GlowTourOverlay",
  standalone: true,
  template: GLOW_TOUR_COMPONENT_TEMPLATES.overlay,
})
export class GlowTourOverlay extends GlowTourElementComponent {
  protected readonly glowTourElementName = "overlay";
}

@Component({
  selector: "GlowTourPreviousTrigger",
  standalone: true,
  template: GLOW_TOUR_COMPONENT_TEMPLATES.previousTrigger,
})
export class GlowTourPreviousTrigger extends GlowTourElementComponent {
  protected readonly glowTourElementName = "previous-trigger";
  @Input() previousLabel = "previous";
}

@Component({
  selector: "GlowTourNextTrigger",
  standalone: true,
  template: GLOW_TOUR_COMPONENT_TEMPLATES.nextTrigger,
})
export class GlowTourNextTrigger extends GlowTourElementComponent {
  protected readonly glowTourElementName = "next-trigger";
  @Input() finishLabel = "finish";
  @Input() nextLabel = "next";

  get label() {
    return glowTour.state.get().isLastStep ? this.finishLabel : this.nextLabel;
  }
}
