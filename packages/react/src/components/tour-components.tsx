import * as React from "react";
import { useValue } from "@glowhop/react-observables";
import { glowTour } from "../../../core/src";

type ElementProps = React.HTMLAttributes<HTMLElement> & {
  as?: React.ElementType;
};
type ContentProps = Omit<React.HTMLAttributes<HTMLElement>, "children">;
type OverlayProps = Omit<React.SVGAttributes<SVGSVGElement>, "ref">;
type ButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type" | "children"> & {
  children?: React.ReactElement;
};

const POPOVER_ID = "glow-tour-popover";
const TITLE_ID = "glow-tour-title";
const DESCRIPTION_ID = "glow-tour-description";

export function Root({ children }: { children: React.ReactNode }) {
  return children;
}

export function Popover({
  children,
  "aria-describedby": ariaDescribedby = DESCRIPTION_ID,
  "aria-labelledby": ariaLabelledby = TITLE_ID,
  id = POPOVER_ID,
  role = "dialog",
  as: Component = "section",
  ...props
}: ElementProps) {
  return (
    <Component
      {...props}
      aria-describedby={ariaDescribedby}
      aria-labelledby={ariaLabelledby}
      data-glow-tour-root
      id={id}
      ref={(element: unknown) => {
        if (element instanceof HTMLElement) glowTour.state.registerElementPopover(element);
      }}
      tabIndex={-1}
      role={role}
    >
      {children}
    </Component>
  );
}

export function Header({ id = TITLE_ID, ...props }: ContentProps) {
  const title = useValue(glowTour.state.snapshot, (state) => {
    return state.currentStep?.presentation.title ?? null;
  });

  return (
    <header {...props} data-glow-tour-header id={id}>
      {title}
    </header>
  );
}

export function Content({
  "aria-live": ariaLive = "polite",
  id = DESCRIPTION_ID,
  ...props
}: ContentProps) {
  const content = useValue(glowTour.state.snapshot, (state) => {
    return state.currentStep?.presentation.content ?? null;
  });

  return (
    <div {...props} aria-live={ariaLive} data-glow-tour-content id={id}>
      {content}
    </div>
  );
}

export function Footer({ children, ...props }: ElementProps) {
  const isHidden = useValue(glowTour.state.snapshot, (state) => {
    return state.currentStep?.presentation.hideFooter === true;
  });

  if (isHidden) {
    return null;
  }

  return (
    <footer {...props} data-glow-tour-footer>
      {children}
    </footer>
  );
}

export function Overlay({
  children,
  "aria-hidden": ariaHidden = true,
  viewBox = "0 0 0 0",
  ...props
}: OverlayProps) {
  return (
    <svg
      {...props}
      aria-hidden={ariaHidden}
      data-glow-tour-overlay
      focusable="false"
      ref={(element) => {
        glowTour.state.registerElementOverlay(element);
      }}
      role="presentation"
      viewBox={viewBox}
    >
      <path data-glow-tour-overlay-path fillRule="evenodd" />
      {children}
    </svg>
  );
}

export function PreviousTrigger({
  children,
  "aria-controls": ariaControls = POPOVER_ID,
  "aria-keyshortcuts": ariaKeyshortcuts = "ArrowLeft",
  "aria-label": ariaLabel,
  ...props
}: ButtonProps) {
  const isDisabled = useValue(glowTour.state.snapshot, (state) => {
    return state.canGoPrevious === false;
  });

  const isHidden = useValue(glowTour.state.snapshot, (state) => {
    return state.isFirstStep || state.currentStep?.presentation.hideBackButton === true;
  });

  const label = useValue(glowTour.state.snapshot, (state) => {
    return state.startOptions.popover?.buttons?.previousLabel ?? "Previous step";
  });

  if (isHidden) {
    return null;
  }

  const baseProps = {
    "aria-controls": ariaControls,
    "aria-keyshortcuts": ariaKeyshortcuts,
    "aria-label": ariaLabel || label,
    disabled: isDisabled,
    type: "button",
    "data-action": "previous",
    "data-glow-tour-previous-trigger": true,
  } as const;

  if (children) {
    return React.cloneElement(children, { ...baseProps, ...props });
  }

  return (
    <button {...baseProps} {...props}>
      {label}
    </button>
  );
}

export function NextTrigger({
  children,
  "aria-controls": ariaControls = POPOVER_ID,
  "aria-keyshortcuts": ariaKeyshortcuts = "Enter ArrowRight",
  "aria-label": ariaLabel,
  ...props
}: ButtonProps) {
  const isDisabled = useValue(glowTour.state.snapshot, (state) => {
    return state.canGoNext === false;
  });

  const isHidden = useValue(glowTour.state.snapshot, (state) => {
    return state.currentStep?.presentation.hideNextButton === true;
  });

  const isLastStep = useValue(glowTour.state.snapshot, (state) => {
    return state.isLastStep;
  });

  const { nextLabel, finishLabel } = useValue(glowTour.state.snapshot, (state) => {
    return {
      nextLabel: state.startOptions.popover?.buttons?.nextLabel ?? "Next step",
      finishLabel: state.startOptions.popover?.buttons?.finishLabel ?? "Finish tour",
    };
  });

  if (isHidden) {
    return null;
  }

  const label = isLastStep ? finishLabel : nextLabel;

  const baseProps = {
    "aria-controls": ariaControls,
    "aria-keyshortcuts": ariaKeyshortcuts,
    "aria-label": ariaLabel || label,
    disabled: isDisabled,
    type: "button",
    "data-action": "next",
    "data-glow-tour-next-trigger": true,
  } as const;

  if (children) {
    return React.cloneElement(children, { ...baseProps, ...props });
  }

  return (
    <button {...baseProps} {...props}>
      {label}
    </button>
  );
}

export const GlowTour = {
  Root,
  Popover,
  Header,
  Content,
  Footer,
  Overlay,
  PreviousTrigger,
  NextTrigger,
};
