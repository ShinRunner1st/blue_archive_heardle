import React from "react";
import { IoRefresh } from "react-icons/io5";

import { accountsEnabled, hasSession } from "../../helpers/accountFlag";
import {
  PopUpCard,
  PopUpCardBody,
  PopUpCardIcon,
  PopUpCardText,
  PopUpCardTitle,
} from "../PopUp";

import * as Styled from "./index.styled";

/** The game and mode on screen, which the reset clears. */
export interface ResetTarget {
  /** As the player sees it, as "Voice · 4-Choice". */
  name: string;
  /** Whether it has anything to clear yet. */
  canReset: boolean;
  onReset: () => void;
}

/**
 * Clears one game and mode's rounds, stats and streak, and nothing else. It
 * takes two presses, since there is no undo, and says which it is on each.
 */
export function ResetStats({ target }: { target: ResetTarget }) {
  const { name, canReset, onReset } = target;
  const signedIn = accountsEnabled() && hasSession();
  const [confirming, setConfirming] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const reset = () => {
    onReset();
    setConfirming(false);
    setDone(true);
  };

  return (
    <PopUpCard>
      <PopUpCardIcon>
        <IoRefresh aria-hidden="true" />
      </PopUpCardIcon>
      <Styled.Stack>
        <PopUpCardBody>
          <PopUpCardTitle>Reset stats</PopUpCardTitle>
          <PopUpCardText>
            Clears the rounds, stats and streak of{" "}
            <Styled.Target>{name}</Styled.Target>, the game and mode on screen.
            Every other one keeps its own.
          </PopUpCardText>
          {signedIn && (
            <PopUpCardText>
              You&apos;re signed in: this resets it here and in your account,
              but another device you&apos;re signed in on that still has these
              rounds brings them back when it next syncs.
            </PopUpCardText>
          )}
        </PopUpCardBody>

        {done ? (
          <Styled.Notice role="status">{name} starts over.</Styled.Notice>
        ) : !canReset ? (
          <Styled.Notice>Nothing to reset here yet.</Styled.Notice>
        ) : confirming ? (
          <>
            <Styled.Notice role="status">
              This can&apos;t be undone.
            </Styled.Notice>
            <Styled.Actions>
              <Styled.Action type="button" $tone="red" onClick={reset}>
                Reset for good
              </Styled.Action>
              <Styled.Action type="button" onClick={() => setConfirming(false)}>
                Cancel
              </Styled.Action>
            </Styled.Actions>
          </>
        ) : (
          <Styled.Actions>
            <Styled.Action
              type="button"
              $tone="red"
              onClick={() => setConfirming(true)}
            >
              Reset
            </Styled.Action>
          </Styled.Actions>
        )}
      </Styled.Stack>
    </PopUpCard>
  );
}
