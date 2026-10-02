/**
 * The content files' shapes as they are written (the loaders in
 * src/constants/ turn some into what the page uses), shared by the content
 * check and the admin tool that edits them.
 */
import type {
  Banner,
  CardColors,
  CardTitle,
  CharacterOption,
  CursorColor,
  Frame,
  ProfileBackground,
} from "../constants/cosmetics";
import type { Mission, MissionGroup } from "../constants/missions";
import type { SeasonEntry } from "../constants/seasons";
import type { SpineCharacter } from "../constants/characters";

export type { SeasonEntry, SpineCharacter };

export interface MissionsFile {
  /** The Missions pop-up's tabs, in order. */
  groups: Array<{ id: MissionGroup; name: string }>;
  missions: Mission[];
}

export interface CosmeticsFile {
  titles: CardTitle[];
  cardColors: CardColors[];
  cursorColors: CursorColor[];
  characters: CharacterOption[];
  banners: Banner[];
  frames: Frame[];
  backgrounds: ProfileBackground[];
}

/** An OST album, as badges.json writes it. */
export interface BadgeEntry {
  number: number;
  title: string;
  /** A file in src/image/badges/. */
  cover: string;
  /** Theme numbers, separated by spaces. */
  songs: string;
}

/** An update in whats-new.json, its icons named from icons.ts. */
export interface NewsEntry {
  id: string;
  name: string;
  items: Array<{ icon: string; title: string; text: string }>;
}

export interface PrivacyFile {
  updated: string;
  contact: string;
  intro: string;
  sections: Array<{
    id: string;
    title: string;
    paragraphs?: string[];
    list?: string[];
  }>;
}

/** A picture by day and by night. */
export interface DayAndNight {
  day: string;
  night: string;
}

/** A place the background moves to once a win streak reaches `wins`. */
export interface StreakPlaceEntry extends DayAndNight {
  wins: number;
  name: string;
}

/** The hub's cards that have a scene behind them. */
export const HUB_CARDS = [
  "ost",
  "voice",
  "picture",
  "students",
  "multiplayer",
] as const;
export type HubCard = (typeof HUB_CARDS)[number];

/** The two big cards on the page before a room. */
export const ROOM_CARDS = ["join", "make"] as const;
export type RoomCard = (typeof ROOM_CARDS)[number];

/**
 * The pictures behind the site's pages. The home background and the
 * streak places ship with the site: files in src/image/, named from
 * there, as they're the first thing a page shows. The hub's cards and
 * Multiplayer's room are on the Worker, by their keys in pictureFiles.ts.
 */
export interface PagePicturesFile {
  /** The background below the first place, and its name after a loss. */
  home: DayAndNight & { name: string };
  places: StreakPlaceEntry[];
  hub: Record<HubCard, string>;
  rooms: DayAndNight;
  /** The scenes behind Join a room and Make a room. */
  roomCards: Record<RoomCard, string>;
}

/** The lists whose ids the lock keeps. */
export type LockList = "missions" | keyof CosmeticsFile;

/** Every mission and cosmetic id ever shipped, by list. */
export type IdsLock = Record<LockList, string[]> & {
  /**
   * Ids released, then taken back before anyone but the maker had them
   * (the user's word, 2026-10-03: only they played). Gone from the lists
   * and the content, on purpose; never used again.
   */
  withdrawn?: Partial<Record<LockList, string[]>>;
};

/** Every content file, by its name in src/content/. */
export interface ContentFiles {
  seasons: SeasonEntry[];
  missions: MissionsFile;
  cosmetics: CosmeticsFile;
  badges: BadgeEntry[];
  whatsNew: NewsEntry[];
  privacy: PrivacyFile;
  idsLock: IdsLock;
  /** Each character's set-up: her sprite, framing, faces and touch. */
  characters: SpineCharacter[];
  pagePictures: PagePicturesFile;
}

export type ContentFileName = keyof ContentFiles;

/** Each content file's name on disk. */
export const CONTENT_FILE_PATHS: Record<ContentFileName, string> = {
  seasons: "seasons.json",
  missions: "missions.json",
  cosmetics: "cosmetics.json",
  badges: "badges.json",
  whatsNew: "whats-new.json",
  privacy: "privacy.json",
  idsLock: "ids.lock.json",
  characters: "characters.json",
  pagePictures: "page-pictures.json",
};
