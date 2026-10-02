/**
 * What the admin page tells its preview frame: the colour scheme and what
 * to draw, from the draft, so the game's own components show it as players
 * would see it.
 */
import type { ColorScheme } from "../constants/theme";
import type {
  BadgeEntry,
  CosmeticsFile,
  MissionsFile,
  NewsEntry,
} from "../content/types";

export type PreviewView =
  | {
      kind: "missions";
      groups: MissionsFile["groups"];
      missions: MissionsFile["missions"];
      cosmetics: CosmeticsFile;
      /** The tab the pop-up opens on. */
      group: string;
      /** The mission being edited, its progress, and whether to toast it. */
      selected?: string;
      value: number;
      toast: boolean;
    }
  | { kind: "whatsNew"; updates: NewsEntry[] }
  | {
      kind: "rewards";
      list: keyof CosmeticsFile;
      cosmetics: CosmeticsFile;
      missions: MissionsFile["missions"];
      /** The reward being edited, by its place in its list. */
      index: number;
      /** Drawn as a player who has cleared every mission, or none. */
      unlocked: boolean;
    }
  /** A picture on the Worker by its key, or none picked. */
  | { kind: "picture"; key: string }
  | {
      kind: "season";
      id: string;
      home: string;
      from: number[];
      to: number[];
      /** The pictures' addresses, or "" for one not made yet. */
      day: string;
      night: string;
    }
  | {
      kind: "badges";
      badges: BadgeEntry[];
      /** Each cover's address, by its file name. */
      covers: Record<string, string>;
      /** The album being edited, and how many of its songs are guessed. */
      selected: number;
      found: number;
    };

export interface PreviewMessage {
  type: "admin-preview";
  scheme: ColorScheme;
  view: PreviewView;
}

/** The frame asks for the view once it's ready for it. */
export interface PreviewReady {
  type: "admin-preview-ready";
}
