import React from "react";
import { IoClose } from "react-icons/io5";

import * as Styled from "./index.styled";

interface Props {
  /** Heading text, also used as the dialog's accessible name. */
  title: string;
  /** Optional one-line description under the heading. */
  subtitle?: string;
  onClose: () => void;
  /**
   * The buttons at the bottom. They stay in view while the body scrolls, so
   * a long pop-up can always be closed.
   */
  actions?: React.ReactNode;
  /** As wide as a laptop's screen allows, for the profile and its like. */
  wide?: boolean;
  /**
   * The body runs to the panel's edges, with the title kept for screen
   * readers only and the close button over the top of it: for a pop-up
   * that opens on a picture, as the profile does.
   */
  bleed?: boolean;
  /** Draws something round the panel, as the profile's frame. */
  frame?: (panel: React.ReactElement) => React.ReactNode;
  children?: React.ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

let openCount = 0;

/**
 * Shared modal shell: one place for the overlay, dismissal, focus handling and
 * dialog semantics, so the pop-ups can't drift apart again.
 *
 * The panel never grows past the screen: the title and the actions stay put
 * and only the body between them scrolls. On a phone it is a sheet from the
 * bottom edge.
 */
export function PopUp({
  title,
  subtitle,
  onClose,
  actions,
  wide = false,
  bleed = false,
  frame,
  children,
}: Props) {
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

  const panel = (
    <Styled.Panel
      ref={panelRef}
      $wide={wide}
      $framed={frame !== undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
    >
      {bleed ? (
        <>
          <Styled.HiddenTitle id={titleId}>{title}</Styled.HiddenTitle>
          <Styled.Close
            type="button"
            onClick={onClose}
            aria-label="Close"
            $over
          >
            <IoClose aria-hidden="true" />
          </Styled.Close>
        </>
      ) : (
        <Styled.Head>
          <Styled.Title id={titleId}>{title}</Styled.Title>
          {subtitle && <Styled.Subtitle>{subtitle}</Styled.Subtitle>}
          <Styled.Close type="button" onClick={onClose} aria-label="Close">
            <IoClose aria-hidden="true" />
          </Styled.Close>
          <Styled.Divider />
        </Styled.Head>
      )}
      <Styled.Scroll $bleed={bleed}>{children}</Styled.Scroll>
      {actions && <Styled.Actions>{actions}</Styled.Actions>}
    </Styled.Panel>
  );

  return (
    <Styled.Overlay
      // Clicking the backdrop dismisses; clicks inside the panel must not.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {frame ? frame(panel) : panel}
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
