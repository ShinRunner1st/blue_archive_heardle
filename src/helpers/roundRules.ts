import { MAX_TRIES } from "../constants/game";
import { GuessType } from "../types/guess";
import { PictureKind, PictureRound } from "../types/picture";
import { Server } from "../types/server";
import { Song } from "../types/song";
import { Round } from "../types/stats";
import { StudentRound } from "../types/student";
import { NamedRound, SKIPPED } from "../types/voice";
import { isFinished } from "./calStats";
import { asGuess } from "./pictureRounds";
import { getServer } from "./server";
import { isOver as isStudentOver, studentById } from "./studentRounds";
import { isOver, triesOf } from "./voiceRounds";

/*
 * What a guess, a skip or a give-up does to a round, in each game. The
 * hooks play with these, and a verified daily's guesses are judged with the
 * same functions (verifiedDaily.ts, on the page and in the accounts
 * Worker), so the two can't come to different results.
 *
 * Each returns the round itself, the same object, for a move the game
 * ignores: one after the round is over, a name already guessed, a student
 * the game doesn't know, a skip in a round with one try. That's how the
 * judge tells a move the page would never have saved.
 */

/** An OST round's six empty tries. */
export function emptyGuesses(): GuessType[] {
  // Built fresh each call so no two slots share an object reference.
  return Array.from({ length: MAX_TRIES }, () => ({
    song: undefined,
    skipped: false,
    isCorrect: undefined,
  }));
}

/** An OST guess fills the try's slot, right or wrong. */
export function guessSong(round: Round, song: Song): Round {
  if (isFinished(round)) return round;

  const isCorrect = song.themeNo === round.solution.themeNo;
  const guesses = [...round.guesses];
  guesses[round.currentTry] = { song, skipped: false, isCorrect };

  return {
    ...round,
    guesses,
    currentTry: round.currentTry + 1,
    didGuess: isCorrect,
  };
}

/** An OST skip uses up the try and plays more of the clip. */
export function skipSong(round: Round): Round {
  if (isFinished(round)) return round;

  const guesses = [...round.guesses];
  guesses[round.currentTry] = {
    song: undefined,
    skipped: true,
    isCorrect: undefined,
  };

  return { ...round, guesses, currentTry: round.currentTry + 1 };
}

/** A Voice guess, or a skip as SKIPPED. */
export function guessName<T extends NamedRound>(round: T, id: number): T {
  if (isOver(round)) return round;
  if (id === SKIPPED ? triesOf(round) === 1 : !studentById.has(id)) {
    return round;
  }
  if (id !== SKIPPED && round.guesses.includes(id)) return round;
  return { ...round, guesses: [...round.guesses, id] };
}

/**
 * A Picture guess, or a skip as SKIPPED: as Voice's, once the student is
 * read as the picture they share (asGuess), so naming any of them is right.
 */
export function guessPicture<T extends PictureRound>(
  kind: PictureKind,
  round: T,
  picked: number,
  server: Server = getServer()
): T {
  if (isOver(round)) return round;
  if (picked === SKIPPED ? triesOf(round) === 1 : !studentById.has(picked)) {
    return round;
  }
  const id = asGuess(kind, round, picked, server);
  if (id !== SKIPPED && round.guesses.includes(id)) return round;
  return { ...round, guesses: [...round.guesses, id] };
}

/** A Students guess: no limit, but each student once. */
export function guessStudent<T extends StudentRound>(round: T, id: number): T {
  if (
    isStudentOver(round) ||
    round.guesses.includes(id) ||
    !studentById.has(id)
  ) {
    return round;
  }
  return { ...round, guesses: [...round.guesses, id] };
}

/** Giving up a Students round, a loss: any time before it's over. */
export function giveUpStudent<T extends StudentRound>(round: T): T {
  return isStudentOver(round) ? round : { ...round, gaveUp: true };
}
