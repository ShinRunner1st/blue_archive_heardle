import React from "react";

import * as Styled from "./index.styled";

interface Props {
  /** Heading text, also used as the dialog's accessible name. */
  title: string;
  /** Optional one-line description under the heading. */
  subtitle?: string;
  onClose: () => void;
  children?: React.ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

let openCount = 0;

/**
 * Shared modal shell: one place for the overlay, dismissal, focus handling and
 * dialog semantics, so the pop-ups can't drift apart again.
 */
export function PopUp({ title, subtitle, onClose, children }: Props) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();

  // Close on Escape, and keep Tab inside the dialog while it is open.
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key !== "Tab") return;

      const focusable =
        panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    // Capture phase, so the dialog wins over the page-level Enter/Space
    // handlers in App and Player.
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [onClose]);

  // Move focus in on open and hand it back to wherever it came from on close.
  // The panel itself takes focus rather than the first link or button, so the
  // dialog is announced from its title and Tab then walks the content in order.
  React.useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;

    panelRef.current?.focus();

    return () => previous?.focus?.();
  }, []);

  // Stop the page behind the overlay from scrolling. Counted, so closing one
  // dialog while another is open doesn't unlock the body early.
  React.useEffect(() => {
    const { body } = document;
    const previousOverflow = body.style.overflow;

    openCount += 1;
    body.style.overflow = "hidden";

    return () => {
      openCount -= 1;
      if (openCount === 0) body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <Styled.Overlay
      // Clicking the backdrop dismisses; clicks inside the panel must not.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Styled.Panel
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <Styled.Title id={titleId}>{title}</Styled.Title>
        {subtitle && <Styled.Subtitle>{subtitle}</Styled.Subtitle>}
        <Styled.Divider />
        {children}
      </Styled.Panel>
    </Styled.Overlay>
  );
}

export const PopUpSection = Styled.Section;
export const PopUpSpacer = Styled.Divider;
export const PopUpBody = Styled.Body;
export const PopUpGroupLabel = Styled.GroupLabel;
export const PopUpCard = Styled.Card;
export const PopUpCardIcon = Styled.CardIcon;
export const PopUpCardBody = Styled.CardBody;
export const PopUpCardTitle = Styled.CardTitle;
export const PopUpCardText = Styled.CardText;
export const PopUpChips = Styled.Chips;
export const PopUpChip = Styled.Chip;
export const PopUpMeta = Styled.Meta;
export const PopUpActions = Styled.Actions;
