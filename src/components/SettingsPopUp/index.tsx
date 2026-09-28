import React from "react";
import { IoNavigate, IoPerson, IoSparkles } from "react-icons/io5";

import { setCharacterChoice } from "../../helpers/characterChoice";
import { setCustomCursor } from "../../helpers/customCursor";
import {
  MAX_PLAYER_NAME,
  setPlayerName,
  setSenseiTitle,
} from "../../helpers/playerName";
import { usePlayerName, useSenseiTitle } from "../../hooks/usePlayerName";
import { useCharacterChoice } from "../../hooks/useCharacterChoice";
import { useCustomCursor } from "../../hooks/useCustomCursor";
import { CharacterChoice } from "../../types/character";
import { Button } from "../Button";
import {
  PopUp,
  PopUpBody,
  PopUpCard,
  PopUpCardBody,
  PopUpCardIcon,
  PopUpCardText,
  PopUpCardTitle,
} from "../PopUp";
import { Switch } from "../Switch";

import { SaveFile } from "./SaveFile";
import * as Styled from "./index.styled";

interface Props {
  onClose: () => void;
}

const CHARACTERS: Array<{ value: CharacterChoice; label: string }> = [
  { value: "auto", label: "Arona & Plana" },
  { value: "mari", label: "Mari" },
  { value: "off", label: "Off" },
];

export function SettingsPopUp({ onClose }: Props) {
  const customCursor = useCustomCursor();
  const character = useCharacterChoice();
  const characterLabel = React.useId();
  const playerName = usePlayerName();
  const senseiTitle = useSenseiTitle();
  const nameLabel = React.useId();

  return (
    <PopUp
      title="Settings"
      subtitle="Saved on this device."
      onClose={onClose}
      actions={
        <Button variant="green" onClick={onClose}>
          Done
        </Button>
      }
    >
      <PopUpBody>
        <Styled.Setting
          type="button"
          role="switch"
          aria-checked={customCursor}
          onClick={() => setCustomCursor(!customCursor)}
        >
          <PopUpCardIcon>
            <IoNavigate aria-hidden="true" />
          </PopUpCardIcon>
          <PopUpCardBody>
            <PopUpCardTitle>Blue Archive cursor</PopUpCardTitle>
            <PopUpCardText>
              The game&apos;s cursor, with its flash on every click and trail
              when you drag. Turn it off to use your own cursor.
            </PopUpCardText>
          </PopUpCardBody>
          <Switch $on={customCursor} aria-hidden="true" />
        </Styled.Setting>

        <PopUpCard>
          <PopUpCardIcon>
            <IoSparkles aria-hidden="true" />
          </PopUpCardIcon>
          <Styled.Stack>
            <PopUpCardBody>
              <PopUpCardTitle id={characterLabel}>Character</PopUpCardTitle>
              <PopUpCardText>
                Stands beside the game on wide screens and reacts to your
                guesses. Hold her to make her look at you, stroke her head, or
                tap her. Arona keeps you company in light mode, Plana in dark.
              </PopUpCardText>
            </PopUpCardBody>
            <Styled.Choices role="radiogroup" aria-labelledby={characterLabel}>
              {CHARACTERS.map(({ value, label }) => (
                <Styled.Choice
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={character === value}
                  $active={character === value}
                  onClick={() => setCharacterChoice(value)}
                >
                  {label}
                </Styled.Choice>
              ))}
            </Styled.Choices>
          </Styled.Stack>
        </PopUpCard>

        <PopUpCard>
          <PopUpCardIcon>
            <IoPerson aria-hidden="true" />
          </PopUpCardIcon>
          <Styled.Stack>
            <PopUpCardBody>
              <PopUpCardTitle id={nameLabel}>Player name</PopUpCardTitle>
              <PopUpCardText>
                Shown on the pictures you share and your Sensei card, and
                nowhere else. It stays on this device. Leave it empty to share
                without a name.
              </PopUpCardText>
            </PopUpCardBody>
            <Styled.NameInput
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.currentTarget.value)}
              maxLength={MAX_PLAYER_NAME}
              placeholder="Your name"
              aria-labelledby={nameLabel}
              autoComplete="nickname"
              spellCheck={false}
            />
            <Styled.NameToggle
              type="button"
              role="switch"
              aria-checked={senseiTitle}
              onClick={() => setSenseiTitle(!senseiTitle)}
            >
              <span>
                &ldquo;Sensei&rdquo; after my name
                <Styled.NameExample>
                  {playerName.trim() || "Arona"}
                  {senseiTitle ? " Sensei" : ""}
                </Styled.NameExample>
              </span>
              <Switch $on={senseiTitle} aria-hidden="true" />
            </Styled.NameToggle>
          </Styled.Stack>
        </PopUpCard>

        <SaveFile />
      </PopUpBody>
    </PopUp>
  );
}
