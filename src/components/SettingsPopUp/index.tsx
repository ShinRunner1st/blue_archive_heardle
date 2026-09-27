import React from "react";
import { IoNavigate, IoSparkles } from "react-icons/io5";

import { setCharacterChoice } from "../../helpers/characterChoice";
import { setCustomCursor } from "../../helpers/customCursor";
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

        <SaveFile />
      </PopUpBody>
    </PopUp>
  );
}
