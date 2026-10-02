/**
 * How a multiplayer room reads on the page: its settings in a few words,
 * the players' places, and an answer's name. Kept apart from the screens
 * (components/Multiplayer/) so it can be tested.
 */
import { songs } from "../constants/songs";
import { Pick, PlayerView, RoomAccess, RoomSettings } from "../types/room";
import { SERVER_NAMES } from "../types/server";
import { places } from "./roomPlaces";
import { studentById } from "./studentRounds";

const songByTheme = new Map(songs.map((song) => [song.themeNo, song]));

/** What a game's rounds are called: songs, voices, halos or weapons. */
export function roundsName(settings: RoomSettings, count = 2): string {
  const one =
    settings.game === "ost"
      ? "song"
      : settings.game === "voice"
      ? "voice"
      : settings.picture;
  return count === 1 ? one : `${one}s`;
}

/**
 * The albums a room deals from, runs of them joined ("1-3, 5, 7-8"), so
 * picking all eight reads "1-8" rather than eight names in a row.
 */
export function albumRanges(albums: number[]): string {
  const runs: Array<[number, number]> = [];
  for (const album of [...albums].sort((a, b) => a - b)) {
    const last = runs[runs.length - 1];
    if (last && album === last[1] + 1) last[1] = album;
    else runs.push([album, album]);
  }
  return runs
    .map(([from, to]) => (from === to ? `${from}` : `${from}-${to}`))
    .join(", ");
}

const START_NAMES: Record<RoomSettings["start"], string> = {
  start: "from the top",
  random: "random start",
};

const ACCESS_NAMES: Record<RoomAccess, string | null> = {
  open: null,
  password: "🔑 password",
  locked: "🔒 locked",
};

/**
 * The settings in a few words each, for the lobby, and who can join when
 * that isn't anyone with the code. Not the most players: the lobby's
 * empty places show it.
 */
export function settingsSummary(
  settings: RoomSettings,
  access: RoomAccess = "open"
): string[] {
  const game =
    settings.game === "ost"
      ? settings.albums.length
        ? `OST Vol.${albumRanges(settings.albums)}`
        : "OST"
      : settings.game === "voice"
      ? settings.lines === "titles"
        ? "Title calls"
        : "Voice"
      : `${settings.picture === "halo" ? "Halo" : "Weapon"}${
          settings.silhouette ? " silhouettes" : "s"
        }`;
  return [
    game,
    settings.answers === "choice" ? "4-Choice" : "Typed",
    `${settings.rounds} ${roundsName(settings, settings.rounds)}`,
    `${settings.guessSeconds}s each`,
    settings.game === "ost"
      ? START_NAMES[settings.start]
      : SERVER_NAMES[settings.server],
    ...(ACCESS_NAMES[access] ? [ACCESS_NAMES[access]!] : []),
  ];
}

/** One of the settings as the lobby's ticket shows it, a chip each. */
export interface SettingRow {
  /** Names the row's icon, and keys it. */
  key:
    | "game"
    | "albums"
    | "lines"
    | "answers"
    | "rounds"
    | "time"
    | "start"
    | "server"
    | "access";
  label: string;
  value: string;
}

const ACCESS_ROWS: Record<RoomAccess, string> = {
  open: "Open",
  password: "Password",
  locked: "Locked",
};

/**
 * The settings as the lobby's ticket shows them, a chip each whose value
 * reads alone ("10 songs", "20s each"), its label for a pointer and screen
 * readers: only the game's own (albums for the OST, lines for Voice),
 * then who can join. Not the most players: the free places show it.
 */
export function settingsRows(
  settings: RoomSettings,
  access: RoomAccess = "open"
): SettingRow[] {
  const { game } = settings;
  const rows: SettingRow[] = [
    {
      key: "game",
      label: "Game",
      value:
        game === "ost"
          ? "OST"
          : game === "voice"
          ? "Voice"
          : `${settings.picture === "halo" ? "Halo" : "Weapon"}${
              settings.silhouette ? " silhouettes" : "s"
            }`,
    },
  ];
  if (game === "ost") {
    rows.push({
      key: "albums",
      label: "Albums",
      value: settings.albums.length
        ? `Vol.${albumRanges(settings.albums)}`
        : "Every song",
    });
  }
  if (game === "voice") {
    rows.push({
      key: "lines",
      label: "Lines",
      value: settings.lines === "titles" ? "Title calls" : "All lines",
    });
  }
  rows.push(
    {
      key: "answers",
      label: "Answers",
      value: settings.answers === "choice" ? "4-Choice" : "Typed",
    },
    {
      key: "rounds",
      label: `How many ${roundsName(settings)}`,
      value: `${settings.rounds} ${roundsName(settings, settings.rounds)}`,
    },
    {
      key: "time",
      label: "Time to answer",
      value: `${settings.guessSeconds}s each`,
    },
    game === "ost"
      ? {
          key: "start",
          label: "Songs start",
          value: settings.start === "start" ? "From the top" : "Random start",
        }
      : {
          key: "server",
          label: "Server",
          value: SERVER_NAMES[settings.server],
        },
    { key: "access", label: "Who can join", value: ACCESS_ROWS[access] }
  );
  return rows;
}

/** An answer as players read it: a song's name, or a student's. */
export function pickName(settings: RoomSettings, pick: Pick): string {
  if (pick === null) return "Skipped";
  if (settings.game === "ost") return songByTheme.get(pick)?.name ?? "?";
  return studentById.get(Number(pick))?.name ?? "?";
}

export { places };

/** The players in the order of their places, ties in the order they came. */
export function standings(players: PlayerView[]): PlayerView[] {
  const place = places(players);
  return [...players].sort((a, b) => place.get(a.id)! - place.get(b.id)!);
}

/** A time on a player's card, to the hundredth, as the standings have it. */
export function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(2)}s`;
}
