/**
 * How a multiplayer room reads on the page: its settings in a few words,
 * the players' places, and an answer's name. Kept apart from the screens
 * (components/Multiplayer/) so it can be tested.
 */
import { songs } from "../constants/songs";
import { Pick, PlayerView, RoomAccess, RoomSettings } from "../types/room";
import { SERVER_NAMES } from "../types/server";
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
        ? `OST Vol.${settings.albums.join("/")}`
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

/** An answer as players read it: a song's name, or a student's. */
export function pickName(settings: RoomSettings, pick: Pick): string {
  if (pick === null) return "Skipped";
  if (settings.game === "ost") return songByTheme.get(pick)?.name ?? "?";
  return studentById.get(Number(pick))?.name ?? "?";
}

/**
 * Each player's place: most right first, the faster over those right
 * breaking a tie, and a tie on both sharing the place (1, 2, 2, 4).
 */
export function places(players: PlayerView[]): Map<string, number> {
  const ahead = (a: PlayerView, b: PlayerView) =>
    a.score > b.score || (a.score === b.score && a.time < b.time);
  return new Map(
    players.map((player) => [
      player.id,
      1 + players.filter((other) => ahead(other, player)).length,
    ])
  );
}

/** The players in the order of their places, ties in the order they came. */
export function standings(players: PlayerView[]): PlayerView[] {
  const place = places(players);
  return [...players].sort((a, b) => place.get(a.id)! - place.get(b.id)!);
}

/** A time on a player's card, to the hundredth, as the standings have it. */
export function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(2)}s`;
}
