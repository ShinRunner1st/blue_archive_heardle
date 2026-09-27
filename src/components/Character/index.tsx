import React from "react";

import { spineCharacters, SpineCharacter } from "../../constants/characters";
import { pickExpression } from "../../helpers/characterMood";
import type { Stage as SpineStage } from "../../helpers/spineStage";
import { useCharacterChoice } from "../../hooks/useCharacterChoice";
import { useColorScheme } from "../../hooks/useColorScheme";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { GuessType } from "../../types/guess";

import * as Styled from "./index.styled";

/** Wide enough for her to stand beside the play area. */
const WIDE = "(min-width: 1100px)";
/** How long she winces at a wrong guess. */
const REACTION_MS = 1200;
/**
 * How long after she appears the other of Arona and Plana is fetched, so a
 * switch of colour scheme finds her ready.
 */
const PRELOAD_PAIR_MS = 4000;

interface Props {
  guesses: GuessType[];
  currentTry: number;
  didGuess: boolean;
  /** Changes when a new round starts. */
  roundKey: string;
  /** The round's tries, when not the usual six. */
  tries?: number;
}

/**
 * The character beside the play area: Arona in light mode and Plana in dark,
 * or Mari if the player picked her. She reacts to the round, and to being
 * held, patted and tapped. Narrow screens and players who turned her off
 * never render her, so never download her or the Spine runtime.
 */
export function Character(props: Props) {
  const wide = useMediaQuery(WIDE);
  const choice = useCharacterChoice();
  const scheme = useColorScheme();
  // Once she has been shown she stays, hidden, when the window narrows: made
  // again she would fetch everything again. Turning her off lets her go.
  const [shown, setShown] = React.useState(wide);
  if (wide && !shown) setShown(true);
  if (!shown || choice === "off") return null;

  const character =
    choice === "mari"
      ? spineCharacters.mari
      : scheme === "dark"
      ? spineCharacters.plana
      : spineCharacters.arona;

  const partner =
    choice === "auto"
      ? scheme === "dark"
        ? spineCharacters.arona
        : spineCharacters.plana
      : null;

  return (
    <Stage {...props} character={character} partner={partner} hidden={!wide} />
  );
}

function Stage({
  character,
  partner,
  hidden,
  guesses,
  currentTry,
  didGuess,
  roundKey,
  tries,
}: Props & {
  character: SpineCharacter;
  partner: SpineCharacter | null;
  hidden: boolean;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const stageRef = React.useRef<SpineStage | null>(null);
  const [ready, setReady] = React.useState(false);
  const playing = useAudioPlaying(roundKey);
  const reacting = useWrongGuessReaction(
    roundKey,
    currentTry,
    didGuess,
    guesses
  );

  const expression = pickExpression(character.moods, {
    currentTry,
    tries,
    didGuess,
    playing,
    reacting,
  });

  // The latest wishes, for when the runtime finishes loading.
  const latest = React.useRef({ character, expression });
  latest.current = { character, expression };

  // The runtime loads on first render only; it is a large chunk.
  React.useEffect(() => {
    let stage: SpineStage | null = null;
    let cancelled = false;
    import("../../helpers/spineStage").then(({ createStage }) => {
      if (cancelled || !canvasRef.current) return;
      stage = createStage(canvasRef.current);
      stage.onReady(() => setReady(true));
      stage.show(latest.current.character);
      stage.setExpression(latest.current.expression);
      stageRef.current = stage;
    });
    return () => {
      cancelled = true;
      stage?.dispose();
      stageRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    stageRef.current?.show(character);
  }, [character]);

  React.useEffect(() => {
    stageRef.current?.setExpression(expression);
  }, [expression]);

  React.useEffect(() => {
    if (!ready || !partner) return;
    const timer = window.setTimeout(
      () => stageRef.current?.preload(partner),
      PRELOAD_PAIR_MS
    );
    return () => window.clearTimeout(timer);
  }, [ready, partner]);

  return (
    <Styled.Stage $ready={ready} $hidden={hidden}>
      <canvas ref={canvasRef} aria-hidden="true" />
    </Styled.Stage>
  );
}

/**
 * True for a moment after a wrong guess made just now in this round - not
 * one in a round resumed on load, nor a skip.
 */
function useWrongGuessReaction(
  roundKey: string,
  currentTry: number,
  didGuess: boolean,
  guesses: GuessType[]
): boolean {
  const [reacting, setReacting] = React.useState(false);
  const previous = React.useRef({ roundKey, currentTry });

  React.useEffect(() => {
    const before = previous.current;
    previous.current = { roundKey, currentTry };
    if (before.roundKey !== roundKey) {
      setReacting(false);
      return;
    }
    if (didGuess || currentTry !== before.currentTry + 1) return;
    const last = guesses[currentTry - 1];
    if (!last?.song || last.isCorrect) return;

    setReacting(true);
    const timer = window.setTimeout(() => setReacting(false), REACTION_MS);
    return () => window.clearTimeout(timer);
  }, [roundKey, currentTry, didGuess, guesses]);

  return reacting;
}

/**
 * Whether any audio on the page is playing: the clip or the answer. Checked
 * again whenever `roundKey` changes: the result screen's player is removed
 * while it plays, and a removed element's pause never reaches the page.
 */
function useAudioPlaying(roundKey: string): boolean {
  const [playing, setPlaying] = React.useState(false);

  React.useEffect(() => {
    const update = () =>
      setPlaying(
        [...document.querySelectorAll("audio")].some((audio) => !audio.paused)
      );
    update();
    // Media events don't bubble, but they can be caught on the way down.
    const events = ["play", "pause", "ended", "emptied"];
    events.forEach((name) => document.addEventListener(name, update, true));
    return () =>
      events.forEach((name) =>
        document.removeEventListener(name, update, true)
      );
  }, [roundKey]);

  return playing;
}
