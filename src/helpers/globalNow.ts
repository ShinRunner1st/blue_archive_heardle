import { Server } from "../types/server";

/**
 * What is on in Blue Archive, on Global and on JP, for the hub: copied from
 * SchaleDB by scripts/build-global-now.mjs to its own Worker, and read from
 * there, never from SchaleDB. Times are in seconds since 1970, as SchaleDB
 * gives them.
 */
export interface TimeSpan {
  start: number;
  end: number;
}

export interface NowBanner extends TimeSpan {
  students: Array<{ id: number; name: string }>;
}

export interface NowEvent extends TimeSpan {
  name: string;
  /** Its logo on the Worker, as nowFile takes it. */
  logo?: string;
}

export interface NowRaid extends TimeSpan {
  /** "Total Assault", "Grand Assault" and so on. */
  kind: string;
  /** The boss, where SchaleDB names it. */
  name?: string;
  terrain?: string;
  /** The boss's picture on the Worker, as nowFile takes it. */
  picture?: string;
}

export interface GlobalNow {
  banners: NowBanner[];
  events: NowEvent[];
  raids: NowRaid[];
}

/** A file beside now.json: the Worker in production, `/now` in development. */
export function nowFile(path: string): string {
  return `${import.meta.env.VITE_NOW_URL || "/now"}/${path}`;
}

export function nowUrl(): string {
  return nowFile("now.json");
}

/** A picture the build script copied: only ever img/<name>.webp. */
const isPicture = (value: unknown): value is string =>
  typeof value === "string" && /^img\/[\w.-]+\.webp$/.test(value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isSpan = (value: Record<string, unknown>): boolean =>
  Number.isFinite(value.start) && Number.isFinite(value.end);

const isText = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length < 200;

/**
 * The file as the hub can trust it: anything malformed is left out, so a bad
 * copy shows less rather than breaking the page. Null when it isn't the file
 * at all.
 */
export function parseNow(value: unknown): GlobalNow | null {
  return parseSchedule(value);
}

/**
 * The whole file: each server's schedule, `{ global, jp }`. A file from
 * before JP came in held Global's alone, at the top; it still reads, as
 * Global's. Null when it isn't the file at all.
 */
export function parseNowFile(
  value: unknown
): Record<Server, GlobalNow | null> | null {
  if (!isRecord(value)) return null;
  if (!("global" in value) && !("jp" in value)) {
    return { global: parseSchedule(value), jp: null };
  }
  return { global: parseSchedule(value.global), jp: parseSchedule(value.jp) };
}

/** One server's schedule, checked. */
function parseSchedule(value: unknown): GlobalNow | null {
  if (!isRecord(value)) return null;
  const list = (key: string) =>
    Array.isArray(value[key]) ? (value[key] as unknown[]).filter(isRecord) : [];

  const banners = list("banners")
    .filter(isSpan)
    .map((banner) => ({
      start: banner.start as number,
      end: banner.end as number,
      students: (Array.isArray(banner.students) ? banner.students : [])
        .filter(isRecord)
        .filter((s) => Number.isInteger(s.id) && isText(s.name))
        .map((s) => ({ id: s.id as number, name: s.name as string })),
    }))
    .filter((banner) => banner.students.length > 0);

  const events = list("events")
    .filter((event) => isSpan(event) && isText(event.name))
    .map((event) => ({
      start: event.start as number,
      end: event.end as number,
      name: event.name as string,
      ...(isPicture(event.logo) ? { logo: event.logo } : {}),
    }));

  const raids = list("raids")
    .filter((raid) => isSpan(raid) && isText(raid.kind))
    .map((raid) => ({
      start: raid.start as number,
      end: raid.end as number,
      kind: raid.kind as string,
      ...(isText(raid.name) ? { name: raid.name } : {}),
      ...(isText(raid.terrain) ? { terrain: raid.terrain } : {}),
      ...(isPicture(raid.picture) ? { picture: raid.picture } : {}),
    }));

  return { banners, events, raids };
}

/**
 * Only what is running at `now` (milliseconds): the copy is refreshed every
 * six hours and SchaleDB can be a few hours behind, so a banner that has
 * ended must not show as on.
 */
export function runningAt(
  data: GlobalNow,
  now: number = Date.now()
): GlobalNow {
  const running = (span: TimeSpan) =>
    span.start * 1000 <= now && now < span.end * 1000;
  return {
    banners: data.banners.filter(running),
    events: data.events.filter(running),
    raids: data.raids.filter(running),
  };
}

export function isEmpty(data: GlobalNow): boolean {
  return (
    data.banners.length === 0 &&
    data.events.length === 0 &&
    data.raids.length === 0
  );
}

/** "3d 4h", "5h 12m", "12m": how long until something ends. */
export function formatLeft(ms: number): string {
  const minutes = Math.max(Math.floor(ms / 60_000), 0);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${Math.max(minutes, 1)}m`;
}
