/**
 * A mission's rule in words: which ways to play it counts from, and a first
 * draft of the mission's text, as the game's own missions word theirs.
 */
import {
  type MissionRule,
  RULE_GAMES,
  RULE_MODES,
  type RuleGame,
} from "../constants/missions";
import { waysOf } from "../helpers/missionRules";
import { SERVER_NAMES } from "../types/server";

/** "a, b or c". */
function either(words: string[]): string {
  if (words.length <= 1) return words.join("");
  return `${words.slice(0, -1).join(", ")} or ${words[words.length - 1]}`;
}

/**
 * The ways to play a rule counts from, by game: "OST: Daily, Classic ·
 * Voice: every way". Empty when it can count nothing.
 */
export function waysLine(rule: MissionRule): string {
  const byGame = new Map<RuleGame, string[]>();
  for (const { game, mode } of waysOf(rule)) {
    byGame.set(game, [
      ...(byGame.get(game) ?? []),
      ...(mode ? [RULE_MODES[mode]] : []),
    ]);
  }
  const all = (game: RuleGame) =>
    new Set(waysOf({ count: "rounds", games: [game] }).map(({ mode }) => mode))
      .size;
  return [...byGame]
    .map(([game, modes]) =>
      modes.length === 0 || modes.length === all(game)
        ? `${RULE_GAMES[game]}: every way`
        : `${RULE_GAMES[game]}: ${modes.join(", ")}`
    )
    .join(" · ");
}

/** What a won round of each game is called, one and many. */
const NOUNS: Record<RuleGame, [string, string]> = {
  ost: ["song", "songs"],
  voice: ["voice", "voices"],
  halo: ["halo", "halos"],
  weapon: ["weapon", "weapons"],
  gameplay: ["student", "students"],
  lore: ["student", "students"],
  multiplayer: ["Multiplayer game", "Multiplayer games"],
};

const VERBS: Record<RuleGame, string> = {
  ost: "Guess",
  voice: "Name",
  halo: "Name",
  weapon: "Name",
  gameplay: "Find",
  lore: "Find",
  multiplayer: "Win",
};

/** The one word the rule's games share, or none. */
function shared<T>(games: RuleGame[], of: (game: RuleGame) => T): T | null {
  const words = new Set(games.map(of));
  return words.size === 1 ? [...words][0] : null;
}

/**
 * A first draft of a mission's text from its rule and goal: "Name 10 halos
 * in a row from their silhouette, in Classic." To edit, not to keep as is.
 */
export function ruleSentence(rule: MissionRule, goal: number): string {
  const games = [...new Set(waysOf(rule).map(({ game }) => game))];
  const many = goal !== 1;
  const noun =
    shared(games, (game) => NOUNS[game][many ? 1 : 0]) ??
    (rule.count === "different"
      ? many
        ? "answers"
        : "answer"
      : many
      ? "rounds"
      : "round");
  const played = rule.result === "played";
  const verb = played
    ? "Play"
    : shared(games, (game) => VERBS[game]) ?? "Clear";

  let head: string;
  switch (rule.count) {
    case "rounds":
      head = `${verb} ${goal} ${noun}`;
      break;
    case "different":
      head = `${verb} ${goal} different ${noun}`;
      break;
    case "streak":
      head = `${verb} ${goal} ${noun} in a row`;
      break;
    case "run":
      head = `${verb} ${goal} ${noun} in one Time Attack run`;
      break;
    case "days":
      head = `${
        played ? "Play" : "Clear"
      } a daily puzzle on ${goal} different day${many ? "s" : ""}`;
      break;
    case "dayStreak":
      head = `${played ? "Play" : "Clear"} a daily puzzle ${goal} day${
        many ? "s" : ""
      } in a row`;
      break;
  }

  const how: string[] = [];
  if (rule.silhouette === true) how.push("from the silhouette");
  if (rule.silhouette === false)
    how.push("from the picture, not the silhouette");
  if (rule.tries === 1) how.push("on the first try");
  else if (rule.tries !== undefined)
    how.push(`in ${rule.tries} tries or fewer`);
  if (rule.clip !== undefined) {
    how.push(
      `from ${rule.clip} second${
        rule.clip === 1 ? "" : "s"
      } of the song or less`
    );
  }
  if (rule.seconds !== undefined) {
    how.push(`in under ${rule.seconds} seconds`);
  }

  const where: string[] = [];
  // The noun names the game, unless it's shared or a day count has none.
  const named =
    rule.count !== "days" &&
    rule.count !== "dayStreak" &&
    shared(games, (game) => NOUNS[game][0]) !== null;
  if (rule.games?.length && !named) {
    where.push(either(rule.games.map((game) => RULE_GAMES[game])));
  } else if (
    rule.games?.length === 1 &&
    (rule.games[0] === "gameplay" || rule.games[0] === "lore")
  ) {
    where.push(rule.games[0] === "gameplay" ? "Gameplay" : "Lore");
  }
  if (rule.modes?.length) {
    where.push(either(rule.modes.map((mode) => RULE_MODES[mode])));
  }
  const server = rule.server ? ` on ${SERVER_NAMES[rule.server]}` : "";

  return `${[head, ...how].join(" ")}${
    where.length ? `, in ${where.join(" ")}` : ""
  }${server}.`;
}
