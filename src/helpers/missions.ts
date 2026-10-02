import { songs } from "../constants";
import { isRoundId, newRoundId } from "./roundId";
import {
  MISSIONS_KEY,
  ROOM_GAMES_KEY,
  ROOM_RECORD_KEY,
} from "../constants/game";
import { Mission, MissionFact, MISSIONS } from "../constants/missions";
import { students } from "../constants/students";
import { VOLUMES } from "../constants/volumes";
import { GAME_MODES } from "../types/mode";
import { PICTURE_KINDS, PICTURE_SLOTS } from "../types/picture";
import { Server, SERVERS } from "../types/server";
import { STUDENT_SLOTS } from "../types/student";
import { NamedRound, VOICE_MODES } from "../types/voice";
import { badgeProgress, guessedThemes } from "./badges";
import { dateOfDay, dayNumber } from "./daily";
import { MissionSave, ruleValues } from "./missionRules";
import {
  loadPictureRounds,
  loadRounds,
  loadStudentRounds,
  loadVoiceRounds,
  notifySaved,
} from "./storage";
import { calStreaks } from "./streaks";
import {
  asRound as studentAsRound,
  isOver as isStudentOver,
  isWon as isStudentWon,
} from "./studentRounds";
import { timeAttackStats } from "./timeAttack";
import {
  asRound as namedAsRound,
  isOver as isNamedOver,
  isWon as isNamedWon,
} from "./voiceRounds";
import { bestWinStreak } from "./winStreak";

export type MissionFacts = Record<MissionFact, number>;

/** The multiplayer games this browser finished, and those it won. */
export interface RoomRecord {
  games: number;
  wins: number;
}

/** One multiplayer game finished, since save format 2. */
export interface RoomGame {
  id: string;
  /** When it ended, in epoch milliseconds. */
  at: number;
  won: boolean;
}

function readJson(key: string): unknown {
  try {
    const text = localStorage.getItem(key);
    return text === null ? null : JSON.parse(text);
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable: the missions still show, just not remembered.
  }
}

const count = (value: unknown) =>
  typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : 0;

/** Checked like the saves, so a bad value never breaks the page. */
export function toRoomRecord(value: unknown): RoomRecord {
  const record =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};
  return { games: count(record.games), wins: count(record.wins) };
}

/**
 * The games finished before save format 2, as two counts. With the list
 * since (loadRoomGames) they make the record; see loadRoomRecord.
 */
export function loadLegacyRoomRecord(): RoomRecord {
  return toRoomRecord(readJson(ROOM_RECORD_KEY));
}

/** The counts from before format 2; the list since is saveRoomGames's. */
export function saveRoomRecord(record: RoomRecord): void {
  writeJson(ROOM_RECORD_KEY, record);
}

/** Checked like the saves: whole games, each once by id. */
export function toRoomGames(value: unknown): RoomGame[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((entry): RoomGame[] => {
    if (typeof entry !== "object" || entry === null) return [];
    const { id, at, won } = entry as Record<string, unknown>;
    if (!isRoundId(id) || seen.has(id)) return [];
    if (typeof at !== "number" || !Number.isSafeInteger(at) || at < 0) {
      return [];
    }
    seen.add(id);
    return [{ id, at, won: won === true }];
  });
}

export function loadRoomGames(): RoomGame[] {
  return toRoomGames(readJson(ROOM_GAMES_KEY));
}

export function saveRoomGames(games: RoomGame[]): void {
  writeJson(ROOM_GAMES_KEY, games);
}

/** Every multiplayer game this browser counts: the old counts and the list. */
export function roomRecordOf(
  legacy: RoomRecord,
  games: RoomGame[]
): RoomRecord {
  return {
    games: legacy.games + games.length,
    wins: legacy.wins + games.filter((game) => game.won).length,
  };
}

export function loadRoomRecord(): RoomRecord {
  return roomRecordOf(loadLegacyRoomRecord(), loadRoomGames());
}

/** Counts a multiplayer game this player saw to its standings. */
export function recordRoomGame(won: boolean, now: number = Date.now()): void {
  saveRoomGames([...loadRoomGames(), { id: newRoundId(), at: now, won }]);
  notifySaved();
}

/** The cleared missions' ids, checked: anything unknown is dropped. */
export function toClearedMissions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const known = new Set(MISSIONS.map(({ id }) => id));
  return [...new Set(value.filter((id) => known.has(id)))];
}

/** Null before the missions were first checked on this device. */
function loadCleared(): string[] | null {
  const value = readJson(MISSIONS_KEY);
  return value === null ? null : toClearedMissions(value);
}

export function loadClearedMissions(): string[] {
  return loadCleared() ?? [];
}

/**
 * How many of the missions there are to clear are cleared: a retired one
 * stays cleared, but isn't counted against today's total.
 */
export function activeClearedCount(
  cleared: Iterable<string> = loadClearedMissions()
): number {
  const done = new Set(cleared);
  return MISSIONS.filter(({ id, retired }) => !retired && done.has(id)).length;
}

export function saveClearedMissions(ids: string[]): void {
  writeJson(MISSIONS_KEY, ids);
}

/** One server's student game, Voice and picture rounds. */
type ServerRounds = Pick<MissionSave, "students" | "voices" | "pictures">;

function serverRounds(server: Server): ServerRounds {
  return {
    students: Object.fromEntries(
      STUDENT_SLOTS.map((slot) => [slot, loadStudentRounds(slot, server)])
    ) as ServerRounds["students"],
    voices: Object.fromEntries(
      VOICE_MODES.map((mode) => [mode, loadVoiceRounds(mode, server)])
    ) as ServerRounds["voices"],
    pictures: Object.fromEntries(
      PICTURE_SLOTS.map((slot) => [slot, loadPictureRounds(slot, server)])
    ) as ServerRounds["pictures"],
  };
}

/**
 * Everything the missions count from this browser: every save on both
 * servers and the multiplayer games. It reads and checks every key, so it
 * runs when a save changes, not each frame.
 */
export function loadMissionSave(): MissionSave {
  return {
    rounds: Object.fromEntries(
      GAME_MODES.map((mode) => [mode, loadRounds(mode)])
    ) as MissionSave["rounds"],
    ...serverRounds("global"),
    jp: serverRounds("jp"),
    roomRecord: loadLegacyRoomRecord(),
    roomGames: loadRoomGames(),
  };
}

/** The days of the daily puzzles won among `rounds`. */
function wonDays<T extends { day?: number }>(
  rounds: T[],
  won: (round: T) => boolean
): Set<number> {
  return new Set(
    rounds.flatMap((round) =>
      won(round) && typeof round.day === "number" ? [round.day] : []
    )
  );
}

/** The most rounds won in one time attack run. */
function bestRun(rounds: NamedRound[]): number {
  const runs = new Map<number, number>();
  for (const round of rounds) {
    if (round.run === undefined || !isNamedWon(round)) continue;
    runs.set(round.run, (runs.get(round.run) ?? 0) + 1);
  }
  return Math.max(0, ...runs.values());
}

const BIRTHDAYS = new Set(
  students.flatMap(({ birthday }) =>
    birthday ? [`${birthday[0]}-${birthday[1]}`] : []
  )
);

function isBirthday(day: number): boolean {
  const date = dateOfDay(day);
  return BIRTHDAYS.has(`${date.getMonth() + 1}-${date.getDate()}`);
}

/**
 * Everything the game's own counts count, from a save: this browser's
 * unless another is given (an imported file, in the admin tool).
 */
export function missionFacts(
  today: number = dayNumber(),
  save: MissionSave = loadMissionSave()
): MissionFacts {
  const ost = save.rounds;
  const servers: ServerRounds[] = SERVERS.map((server) =>
    server === "jp" ? save.jp : save
  );
  const room = roomRecordOf(save.roomRecord, save.roomGames);

  const ostDailyDays = wonDays(ost.daily, (round) => round.didGuess);
  const guessed = guessedThemes([...ost.daily, ...ost.endless]);
  const timeAttack = timeAttackStats(ost.timeattack);

  let dailiesWon = ostDailyDays.size;
  let daySweep = 0;
  let bothDailies = 0;
  let birthdayDaily = [...ostDailyDays].some(isBirthday) ? 1 : 0;
  const dailyStreaks = [calStreaks(ost.daily, today).max];
  const winStreaks = [bestWinStreak(ost.endless), bestWinStreak(ost.choice)];

  let voiceFirstTry = 0;
  let voiceNoHintWins = 0;
  let voiceTimeAttack = 0;
  const voicesNamed = new Set<number>();
  let haloShapes = 0;
  let weaponShapes = 0;
  const picturesNamed = new Set<string>();
  let quickFinds = 0;
  let minuteFinds = 0;
  const studentsFound = new Set<number>();
  let jpRounds = 0;

  servers.forEach(({ students: bySlot, voices, pictures }, index) => {
    const studentDays = {
      gameplay: wonDays(bySlot["gameplay-daily"], isStudentWon),
      lore: wonDays(bySlot["lore-daily"], isStudentWon),
    };
    const otherDays = [
      wonDays(voices.daily, isNamedWon),
      ...PICTURE_KINDS.map((kind) =>
        wonDays(pictures[`${kind}-daily`], isNamedWon)
      ),
      studentDays.gameplay,
      studentDays.lore,
    ];
    dailiesWon += otherDays.reduce((total, days) => total + days.size, 0);
    const allDays = new Set(
      [ostDailyDays, ...otherDays].flatMap((d) => [...d])
    );
    for (const day of allDays) {
      const cleared = [ostDailyDays, ...otherDays].filter((days) =>
        days.has(day)
      ).length;
      daySweep = Math.max(daySweep, cleared);
      if (isBirthday(day)) birthdayDaily = 1;
    }
    bothDailies += [...studentDays.gameplay].filter((day) =>
      studentDays.lore.has(day)
    ).length;

    dailyStreaks.push(
      calStreaks(voices.daily.map(namedAsRound), today).max,
      ...PICTURE_KINDS.map(
        (kind) =>
          calStreaks(pictures[`${kind}-daily`].map(namedAsRound), today).max
      ),
      calStreaks(bySlot["gameplay-daily"].map(studentAsRound), today).max,
      calStreaks(bySlot["lore-daily"].map(studentAsRound), today).max
    );

    // Voice: a first-try find is in a round with tries (not 4-Choice's one).
    for (const mode of ["daily", "endless", "nohint"] as const) {
      voiceFirstTry += voices[mode].filter(
        (round) => isNamedWon(round) && round.guesses.length === 1
      ).length;
    }
    voiceNoHintWins += voices.nohint.filter(isNamedWon).length;
    voiceTimeAttack = Math.max(voiceTimeAttack, bestRun(voices.timeattack));
    VOICE_MODES.forEach((mode) =>
      voices[mode]
        .filter(isNamedWon)
        .forEach(({ answer }) => voicesNamed.add(answer))
    );
    for (const mode of ["endless", "nohint", "choice"] as const) {
      winStreaks.push(bestWinStreak(voices[mode].map(namedAsRound)));
    }

    // Picture: silhouettes are their own ways to play, or a run of them.
    for (const kind of PICTURE_KINDS) {
      const shapes = [
        ...pictures[`${kind}-silhouette`],
        ...pictures[`${kind}-silhouette-nohint`],
        ...pictures[`${kind}-choice-silhouette`],
        ...pictures[`${kind}-timeattack`].filter((round) => round.shape),
      ].filter(isNamedWon).length;
      if (kind === "halo") haloShapes += shapes;
      else weaponShapes += shapes;
    }
    for (const slot of PICTURE_SLOTS) {
      const rounds = pictures[slot];
      // A picture named in two ways to play is still one picture.
      const kind = slot.split("-")[0];
      rounds
        .filter(isNamedWon)
        .forEach(({ answer }) => picturesNamed.add(`${kind}:${answer}`));
      if (!slot.endsWith("-daily") && !slot.endsWith("-timeattack")) {
        winStreaks.push(bestWinStreak(rounds.map(namedAsRound)));
      }
    }

    const studentRounds = STUDENT_SLOTS.flatMap((slot) => bySlot[slot]);
    const found = studentRounds.filter(isStudentWon);
    quickFinds += found.filter(({ guesses }) => guesses.length <= 3).length;
    minuteFinds += found.filter(
      ({ time }) => time !== undefined && time < 60_000
    ).length;
    found.forEach(({ answer }) => studentsFound.add(answer));
    winStreaks.push(
      bestWinStreak(bySlot["gameplay-endless"].map(studentAsRound)),
      bestWinStreak(bySlot["lore-endless"].map(studentAsRound))
    );

    if (SERVERS[index] === "jp") {
      jpRounds =
        studentRounds.filter(isStudentOver).length +
        VOICE_MODES.flatMap((mode) => voices[mode]).filter(isNamedOver).length +
        PICTURE_SLOTS.flatMap((slot) => pictures[slot]).filter(isNamedOver)
          .length;
    }
  });

  const bestDailyStreak = Math.max(...dailyStreaks);

  return {
    dailiesWon,
    daySweep,
    bestDailyStreak,
    birthdayDaily,
    ostFirstTry: [...ost.daily, ...ost.endless].filter(
      (round) => round.didGuess && round.currentTry === 1
    ).length,
    songsGuessed: songs.filter((song) => guessed.has(song.themeNo)).length,
    badgesEarned: badgeProgress(guessed).filter((badge) => badge.done).length,
    ostTimeAttack: Math.max(timeAttack.best.typed, timeAttack.best.choice),
    choiceStreak: bestWinStreak(ost.choice),
    voiceFirstTry,
    voiceNoHintWins,
    voicesNamed: voicesNamed.size,
    voiceTimeAttack,
    haloShapes,
    weaponShapes,
    picturesNamed: picturesNamed.size,
    quickFinds,
    minuteFinds,
    bothDailies,
    studentsFound: studentsFound.size,
    roomsPlayed: room.games,
    roomsWon: room.wins,
    jpRounds,
    bestStreak: Math.max(bestDailyStreak, ...winStreaks),
  };
}

export interface MissionProgress {
  mission: Mission;
  /** How far along, up to the goal. */
  value: number;
  goal: number;
  done: boolean;
}

/**
 * The facts a mission can ask "all" of, and how many that is: it grows
 * with each song or album added.
 */
export const FACT_TOTALS: Partial<Record<MissionFact, () => number>> = {
  songsGuessed: () => songs.length,
  badgesEarned: () => VOLUMES.length,
};

export function goalOf(mission: Mission): number {
  if (mission.goal !== "all") return mission.goal;
  return (mission.fact && FACT_TOTALS[mission.fact]?.()) || Infinity;
}

/**
 * Each mission's count among the facts, or among the rule counts (see
 * missionRules.ts) for a mission with a rule.
 */
export function missionValue(
  mission: Mission,
  facts: MissionFacts,
  ruled: Record<string, number>
): number {
  if (mission.rule) return ruled[mission.id] ?? 0;
  return mission.fact ? facts[mission.fact] : 0;
}

/**
 * Every mission's progress: done once its fact reaches the goal, or for
 * good once it was cleared before, even if the rounds that cleared it have
 * since been reset. A retired mission is listed only for whoever cleared
 * it, and can't be cleared any more.
 */
export function missionProgress(
  facts: MissionFacts,
  cleared: Iterable<string> = loadClearedMissions(),
  ruled: Record<string, number> = {}
): MissionProgress[] {
  const before = new Set(cleared);
  const shown = MISSIONS.filter(
    ({ id, retired }) => !retired || before.has(id)
  );
  return shown.map((mission) => {
    const goal = goalOf(mission);
    const value = missionValue(mission, facts, ruled);
    const reached = !mission.retired && value >= goal;
    const done = reached || before.has(mission.id);
    return {
      mission,
      value: done ? goal : Math.min(value, goal),
      goal,
      done,
    };
  });
}

export interface MissionCheck {
  /** Missions cleared since the last check, in the list's order. */
  cleared: Mission[];
  /**
   * The first check on this device: what was cleared already is news only
   * as a count, not a toast each.
   */
  first: boolean;
}

/** Every mission's progress from this browser's saves, read once. */
export function readMissionProgress(
  today: number = dayNumber()
): MissionProgress[] {
  const save = loadMissionSave();
  return missionProgress(
    missionFacts(today, save),
    undefined,
    ruleValues(save)
  );
}

/**
 * Works the missions out from the saves and remembers any newly cleared.
 * Tells the listeners (the Missions pop-up, the cosmetics' pickers) when one
 * was. Without facts it reads the saves; facts given (by a test) come with
 * the rule counts read from the saves unless those are given too.
 */
export function checkMissions(
  facts?: MissionFacts,
  ruled?: Record<string, number>
): MissionCheck {
  const save = facts && ruled ? null : loadMissionSave();
  const stored = loadCleared();
  const before = new Set(stored ?? []);
  const cleared = missionProgress(
    facts ?? missionFacts(dayNumber(), save!),
    before,
    ruled ?? ruleValues(save!)
  )
    .filter(({ done, mission }) => done && !before.has(mission.id))
    .map(({ mission }) => mission);
  if (cleared.length > 0 || stored === null) {
    saveClearedMissions([...before, ...cleared.map(({ id }) => id)]);
  }
  if (cleared.length > 0) listeners.forEach((listener) => listener());
  return { cleared, first: stored === null };
}

/** Whether a mission is cleared, as last checked. */
export function isMissionCleared(id: string | undefined): boolean {
  return id === undefined || loadClearedMissions().includes(id);
}

const listeners = new Set<() => void>();

/** Hears when a mission is newly cleared, or the cleared ones replaced. */
export function subscribeMissions(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
