/**
 * The win message for each try, told as a Blue Archive mission: a first-try
 * win is a three-star clear, and it gets hairier from there. Shared by the
 * result screen and the result picture.
 */
export const TEXT_FOR_TRY = [
  "3★ clear on the first try! ✨",
  "Sensei's EX Skill landed! 💥",
  "Mission complete, Sensei~ 📋",
  "Schale pulls through! 💪",
  "A narrow escape in Kivotos… 😅",
  "Cleared at the last second! 😭💥",
];

/** A four-choice win: one try, so no stars to count. */
export const CHOICE_WIN_TITLE = "Target acquired, Sensei! 🎯";

export const LOSS_TITLE = "Tactical retreat, Sensei… 💔";
export const LOSS_TEXT = "Arona says there's always next time! 📱";

/**
 * The result title for a finished round. `tries` is the round's own, for one
 * with a single try.
 */
export function resultTitle(
  didGuess: boolean,
  currentTry: number,
  tries?: number
): string {
  if (!didGuess) return LOSS_TITLE;
  if (tries === 1) return CHOICE_WIN_TITLE;
  return TEXT_FOR_TRY[
    Math.min(Math.max(currentTry - 1, 0), TEXT_FOR_TRY.length - 1)
  ];
}

/**
 * The student game's win titles, by guesses: a first-guess find is still a
 * three-star clear, but with over a hundred students to go through, a few
 * guesses is good going.
 */
const STUDENT_WIN_TITLES: Array<[upTo: number, title: string]> = [
  [1, TEXT_FOR_TRY[0]],
  [3, TEXT_FOR_TRY[1]],
  [6, TEXT_FOR_TRY[2]],
  [10, TEXT_FOR_TRY[3]],
  [Infinity, TEXT_FOR_TRY[4]],
];

export function studentResultTitle(won: boolean, guesses: number): string {
  if (!won) return LOSS_TITLE;
  const found = STUDENT_WIN_TITLES.find(([upTo]) => guesses <= upTo);
  return found ? found[1] : TEXT_FOR_TRY[4];
}
