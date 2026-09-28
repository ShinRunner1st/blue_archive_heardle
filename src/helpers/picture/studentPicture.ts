import { studentResultTitle } from "../../constants/resultText";
import { students } from "../../constants/students";
import {
  ICON_CELL,
  ICON_COLUMNS,
  ICON_SHEET_KEY,
  ICON_SIZE,
} from "../../constants/studentIcons";
import {
  Student,
  StudentGame,
  StudentMode,
  StudentRound,
} from "../../types/student";
import { dateStamp } from "../daily";
import { loadIconSheet } from "../iconSheet";
import { compareStudents, Verdict } from "../studentClues";
import {
  formatSolveTime,
  isWon,
  poolOf,
  roundTime,
  studentById,
} from "../studentRounds";
import {
  COLORS,
  CONTENT_LEFT as LEFT,
  CONTENT_RIGHT as RIGHT,
  drawAddress,
  drawFrame,
  fitText,
  FONT,
  loadImage,
  makePicture,
  PANEL,
  PictureImages,
  roundedRect,
  withoutEmoji,
} from "./canvas";
import {
  drawRecapPicture,
  RecapPictureContent,
  reportDate,
} from "./recapPicture";

const GAME_NAMES: Record<StudentGame, string> = {
  gameplay: "Gameplay",
  lore: "Lore",
};

export interface StudentPictureInput {
  game: StudentGame;
  mode: StudentMode;
  round: StudentRound;
  answer: Student;
  /** The endless "found/played" tally. */
  score: string;
  /** Daily's day streak, or endless finds in a row. */
  streak: number;
}

/** A row of the grid: a guess's verdicts, or a note of guesses left out. */
export type GridRow = Verdict[] | { hidden: number };

export interface StudentPictureContent {
  tag: string;
  title: string;
  subtitle: string;
  rows: GridRow[];
  stats: Array<{ label: string; value: string }>;
  /** The answer, on endless pictures only: a daily one must spoil nothing. */
  answer: Student | null;
}

/** More rows than this and the middle ones make way for a note. */
const MAX_ROWS = 5;

/**
 * What goes on the picture, worked out apart from drawing so it can be
 * tested. Like the share text, the squares say how each guess went and
 * nothing of who was guessed.
 */
export function studentPictureContent({
  game,
  mode,
  round,
  answer,
  score,
  streak,
}: StudentPictureInput): StudentPictureContent {
  const isDaily = mode === "daily";
  const won = isWon(round);
  const count = round.guesses.length;
  const guesses = count === 1 ? "guess" : "guesses";
  const time = roundTime(round);

  const all = round.guesses.flatMap((id) => {
    const guess = studentById.get(id);
    return guess
      ? [compareStudents(guess, answer, game).map((clue) => clue.verdict)]
      : [];
  });
  const rows: GridRow[] =
    all.length > MAX_ROWS
      ? [
          ...all.slice(0, MAX_ROWS - 2),
          { hidden: all.length - (MAX_ROWS - 1) },
          all[all.length - 1],
        ]
      : all;

  return {
    // The game, the way to play and the mode.
    tag:
      isDaily && typeof round.day === "number"
        ? `STUDENTS · ${GAME_NAMES[game].toUpperCase()} · DAILY #${round.day}`
        : `STUDENTS · ${GAME_NAMES[game].toUpperCase()} · ENDLESS`,
    title: withoutEmoji(studentResultTitle(won, count)),
    subtitle:
      (won
        ? `Found in ${count} ${guesses}`
        : `Gave up after ${count} ${guesses}`) + (time ? ` in ${time}` : ""),
    rows,
    stats: isDaily
      ? [
          { label: "Guesses", value: won ? String(count) : "X" },
          { label: "Day streak", value: String(streak) },
        ]
      : [
          { label: "Score", value: score },
          { label: "Find streak", value: String(streak) },
        ],
    answer: isDaily ? null : answer,
  };
}

const VERDICT_COLORS: Record<Verdict, string> = {
  right: COLORS.green,
  close: "#E3A81B",
  wrong: COLORS.red,
};

const SQUARE = 34;
const GAP = 6;
const GRID_TOP = 340;

/**
 * Draws a student's icon from the sheet, rounded, or a plain tile if the
 * sheet didn't load.
 */
export function drawStudentIcon(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLImageElement | null,
  id: number,
  x: number,
  y: number,
  size: number
): void {
  ctx.save();
  roundedRect(ctx, x, y, size, size, size * 0.16);
  ctx.clip();
  ctx.fillStyle = COLORS.unused;
  ctx.fillRect(x, y, size, size);
  const cell = students.findIndex((student) => student.id === id);
  if (sheet && sheet.naturalWidth > 0 && cell >= 0) {
    const margin = (ICON_CELL - ICON_SIZE) / 2;
    ctx.drawImage(
      sheet,
      (cell % ICON_COLUMNS) * ICON_CELL + margin,
      Math.floor(cell / ICON_COLUMNS) * ICON_CELL + margin,
      ICON_SIZE,
      ICON_SIZE,
      x,
      y,
      size,
      size
    );
  }
  ctx.restore();
}

export function drawStudentPicture(
  ctx: CanvasRenderingContext2D,
  content: StudentPictureContent,
  images: PictureImages,
  sheet: HTMLImageElement | null
): void {
  drawFrame(ctx, images, content.tag);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = content.subtitle.startsWith("Found")
    ? COLORS.navy
    : COLORS.red;
  fitText(ctx, content.title, LEFT, 262, RIGHT - LEFT, "800", 52);

  ctx.fillStyle = COLORS.muted;
  ctx.font = `600 28px ${FONT}`;
  ctx.fillText(content.subtitle, LEFT, 308);

  // The guesses, oldest on top, a square for each column.
  let widest = 0;
  content.rows.forEach((row, index) => {
    const y = GRID_TOP + index * (SQUARE + GAP);
    if ("hidden" in row) {
      ctx.fillStyle = COLORS.muted;
      ctx.font = `700 22px ${FONT}`;
      ctx.textAlign = "left";
      ctx.fillText(`+ ${row.hidden} more`, LEFT + 4, y + SQUARE - 9);
      return;
    }
    row.forEach((verdict, column) => {
      ctx.fillStyle = VERDICT_COLORS[verdict];
      roundedRect(ctx, LEFT + column * (SQUARE + GAP), y, SQUARE, SQUARE, 8);
      ctx.fill();
    });
    widest = Math.max(widest, row.length);
  });

  // The stats, side by side, to the right of the grid.
  const statsLeft = LEFT + Math.max(widest, 6) * (SQUARE + GAP) + 50;
  content.stats.forEach(({ label, value }, index) => {
    const x = statsLeft + index * 200;
    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.navy;
    fitText(ctx, value, x, GRID_TOP + 36, 180, "800", 44);
    ctx.fillStyle = COLORS.muted;
    ctx.font = `700 18px ${FONT}`;
    ctx.fillText(label.toUpperCase(), x, GRID_TOP + 62);
  });

  const bottom = PANEL.y + PANEL.height - 40;
  if (content.answer) {
    // The answer under the stats: its icon, name and school.
    const top = GRID_TOP + 96;
    drawStudentIcon(ctx, sheet, content.answer.id, statsLeft, top, 88);
    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.blue;
    fitText(
      ctx,
      content.answer.name,
      statsLeft + 108,
      top + 42,
      RIGHT - statsLeft - 108,
      "800",
      34
    );
    ctx.fillStyle = COLORS.muted;
    fitText(
      ctx,
      `${content.answer.school} · ${content.answer.club}`,
      statsLeft + 108,
      top + 76,
      RIGHT - statsLeft - 108,
      "600",
      22
    );
  } else {
    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.blue;
    fitText(
      ctx,
      "Can you find today's student?",
      statsLeft,
      GRID_TOP + 140,
      RIGHT - statsLeft,
      "800",
      32
    );
  }

  drawAddress(ctx, bottom - 8);
}

/** The icon sheet as a picture to draw from, or null if it won't load. */
export async function loadSheetImage(): Promise<HTMLImageElement | null> {
  return loadImage(await loadIconSheet(ICON_SHEET_KEY));
}

/** Draws the picture as a PNG. Fails only if the browser has no canvas. */
export async function makeStudentPicture(
  input: StudentPictureInput,
  sources: { backdrop: string; logo: string }
): Promise<Blob> {
  const content = studentPictureContent(input);
  const sheet = content.answer ? await loadSheetImage() : null;
  return makePicture(sources, (ctx, images) =>
    drawStudentPicture(ctx, content, images, sheet)
  );
}

/** Daily pictures are named by puzzle; endless ones never name the student. */
export function studentPictureName({
  game,
  mode,
  round,
}: StudentPictureInput): string {
  return mode === "daily" && typeof round.day === "number"
    ? `baheardle-${game}-${round.day}.png`
    : `baheardle-${game}.png`;
}

/** A student game's record, as its stats pop-up has it. */
export interface StudentRecapStats {
  game: StudentGame;
  mode: StudentMode;
  /** Gave up at 0, then finds by guesses, 1 to 9 and 10 or more. */
  tally: number[];
  played: number;
  averageGuesses: number;
  /** The quickest timed find in ms, or null before any. */
  fastest?: number | null;
  streak: number;
  best: number;
  /** Different students found at least once. */
  found: number;
}

/**
 * The student game's recap, on the same card as the OST's. The bars group
 * the guesses so they fit: 1, 2, 3, 4-5, 6-9, 10 or more, then gave up.
 */
export function studentRecapContent(
  stats: StudentRecapStats,
  now: Date = new Date()
): RecapPictureContent {
  const { tally, played } = stats;
  const wins = played - tally[0];
  const rate = played > 0 ? Math.round((wins / played) * 100) : 0;
  const isDaily = stats.mode === "daily";
  const sum = (from: number, to: number) =>
    tally.slice(from, to + 1).reduce((total, count) => total + count, 0);
  const name = GAME_NAMES[stats.game];
  const mode = isDaily ? "Daily" : "Endless";

  return {
    tag: `STUDENTS · ${name.toUpperCase()} · ${mode.toUpperCase()} RECAP`,
    title: `Students ${name} ${mode} report`,
    subtitle: reportDate(now),
    tiles: [
      { label: isDaily ? "Puzzles" : "Rounds", value: String(played) },
      { label: "Found", value: `${rate}%` },
      {
        label: isDaily ? "Day streak" : "Find streak",
        value: String(stats.streak),
      },
      { label: "Best streak", value: String(stats.best) },
    ],
    barsLabel: "Found in",
    bars: [
      { label: "1", count: sum(1, 1) },
      { label: "2", count: sum(2, 2) },
      { label: "3", count: sum(3, 3) },
      { label: "4-5", count: sum(4, 5) },
      { label: "6-9", count: sum(6, 9) },
      { label: "10+", count: sum(10, 10) },
      { label: "X", count: tally[0], lost: true },
    ],
    footer: [
      `${stats.averageGuesses || "-"} guesses a find`,
      `${stats.found} of ${poolOf(stats.game).length} students found`,
      ...(typeof stats.fastest === "number"
        ? [`fastest ${formatSolveTime(stats.fastest)}`]
        : []),
    ].join(" · "),
  };
}

export function makeStudentRecap(
  stats: StudentRecapStats,
  sources: { backdrop: string; logo: string }
): Promise<Blob> {
  const content = studentRecapContent(stats);
  return makePicture(sources, (ctx, images) =>
    drawRecapPicture(ctx, content, images)
  );
}

export function studentRecapName(
  { game, mode }: Pick<StudentRecapStats, "game" | "mode">,
  now: Date = new Date()
): string {
  return `baheardle-${game}-${mode}-recap-${dateStamp(now)}.png`;
}
