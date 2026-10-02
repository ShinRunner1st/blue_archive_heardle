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

export type { SeasonEntry };

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

/** Every mission and cosmetic id ever shipped, by list. */
export type IdsLock = Record<"missions" | keyof CosmeticsFile, string[]>;

/** Every content file, by its name in src/content/. */
export interface ContentFiles {
  seasons: SeasonEntry[];
  missions: MissionsFile;
  cosmetics: CosmeticsFile;
  badges: BadgeEntry[];
  whatsNew: NewsEntry[];
  privacy: PrivacyFile;
  idsLock: IdsLock;
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
};
