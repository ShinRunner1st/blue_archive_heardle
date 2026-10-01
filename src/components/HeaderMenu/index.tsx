import React from "react";
import {
  IoClose,
  IoDisc,
  IoGift,
  IoGameController,
  IoIdCard,
  IoPerson,
  IoInformationCircle,
  IoMenu,
  IoMoon,
  IoMusicalNotes,
  IoRibbon,
  IoSettings,
} from "react-icons/io5";

import { switchColorScheme } from "../../helpers/colorScheme";
import { preloadCovers } from "../../helpers/preloadCovers";
import { Switch } from "../Switch";
import { useColorScheme } from "../../hooks/useColorScheme";

import * as Styled from "./index.styled";

interface Props {
  openInfoPopUp: () => void;
  openHowToPopUp: () => void;
  openSettingsPopUp: () => void;
  openWhatsNewPopUp: () => void;
  openJukeboxPopUp: () => void;
  openBadgesPopUp: () => void;
  openMissionsPopUp: () => void;
  openSenseiCard: () => void;
  openProfile: () => void;
}

/**
 * The header's less-used controls behind one button, so the bar keeps only
 * what players reach for every round. A disclosure rather than an ARIA menu:
 * the items are ordinary buttons, reachable with Tab straight after the toggle.
 */
export function HeaderMenu({
  openInfoPopUp,
  openHowToPopUp,
  openSettingsPopUp,
  openWhatsNewPopUp,
  openJukeboxPopUp,
  openBadgesPopUp,
  openMissionsPopUp,
  openSenseiCard,
  openProfile,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const toggleRef = React.useRef<HTMLButtonElement>(null);
  const panelId = React.useId();

  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const close = React.useCallback(() => setOpen(false), []);

  // Dismiss on a tap outside, or on Escape - which also hands focus back.
  React.useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) close();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Capture phase, so the search box doesn't also clear itself.
      e.stopPropagation();
      close();
      toggleRef.current?.focus();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [open, close]);

  const openPopUp = (openIt: () => void) => () => {
    close();
    openIt();
  };

  // Stays open, so the switch can be seen flipping while the page changes.
  const toggleScheme = (e: React.MouseEvent<HTMLButtonElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    switchColorScheme(isDark ? "light" : "dark", {
      x: box.left + box.width / 2,
      y: box.top + box.height / 2,
    });
  };

  return (
    <Styled.Wrapper ref={wrapperRef}>
      <Styled.Toggle
        ref={toggleRef}
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Menu"
      >
        <Styled.ToggleIcon key={String(open)}>
          {open ? (
            <IoClose size="1em" aria-hidden="true" />
          ) : (
            <IoMenu size="1em" aria-hidden="true" />
          )}
        </Styled.ToggleIcon>
      </Styled.Toggle>

      {open && (
        <Styled.Panel id={panelId}>
          <Styled.Item type="button" onClick={openPopUp(openJukeboxPopUp)}>
            <IoMusicalNotes aria-hidden="true" />
            Jukebox
          </Styled.Item>
          <Styled.Item
            type="button"
            onClick={openPopUp(openBadgesPopUp)}
            // Start on the covers as soon as the player heads for the item.
            onPointerEnter={preloadCovers}
            onPointerDown={preloadCovers}
            onFocus={preloadCovers}
          >
            <IoDisc aria-hidden="true" />
            OST badges
          </Styled.Item>
          <Styled.Item type="button" onClick={openPopUp(openProfile)}>
            <IoPerson aria-hidden="true" />
            Profile
          </Styled.Item>
          <Styled.Item type="button" onClick={openPopUp(openMissionsPopUp)}>
            <IoRibbon aria-hidden="true" />
            Missions
          </Styled.Item>
          <Styled.Item type="button" onClick={openPopUp(openSenseiCard)}>
            <IoIdCard aria-hidden="true" />
            Sensei card
          </Styled.Item>
          <Styled.Item type="button" onClick={openPopUp(openHowToPopUp)}>
            <IoGameController aria-hidden="true" />
            How to play
          </Styled.Item>
          <Styled.Item
            type="button"
            role="switch"
            aria-checked={isDark}
            onClick={toggleScheme}
          >
            <IoMoon aria-hidden="true" />
            Dark mode
            <Switch $on={isDark} aria-hidden="true" />
          </Styled.Item>
          <Styled.Item type="button" onClick={openPopUp(openSettingsPopUp)}>
            <IoSettings aria-hidden="true" />
            Settings
          </Styled.Item>
          <Styled.Divider />
          <Styled.Item type="button" onClick={openPopUp(openWhatsNewPopUp)}>
            <IoGift aria-hidden="true" />
            What&apos;s new
          </Styled.Item>
          <Styled.Item type="button" onClick={openPopUp(openInfoPopUp)}>
            <IoInformationCircle aria-hidden="true" />
            About this game
          </Styled.Item>
        </Styled.Panel>
      )}
    </Styled.Wrapper>
  );
}
