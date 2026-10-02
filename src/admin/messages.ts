/**
 * What the admin page tells its preview frame: the colour scheme and what
 * to draw, from the draft, so the game's own components show it as players
 * would see it.
 */
import type { ColorScheme } from "../constants/theme";
import type { SpineCharacter } from "../constants/characters";
import type {
  BadgeEntry,
  CosmeticsFile,
  DayAndNight,
  HubCard,
  RoomCard,
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
      /**
       * A player's save, imported: each mission's count in it, by id, and
       * the missions it had cleared, in place of the progress picked.
       */
      save?: { values: Record<string, number>; cleared: string[] };
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
      /** Where it's shown: its own screen, or a room's (lobby, round...). */
      screen?: "own" | "lobby" | "round" | "standings";
    }
  /** A picture on the Worker by its key, or none picked. */
  | { kind: "picture"; key: string }
  | {
      kind: "page";
      /** Which page picture: the home background, a place, the hub, rooms. */
      part: "home" | "place" | "hub" | "rooms";
      /** The home's or place's pictures, as addresses the frame can load. */
      day: string;
      night: string;
      /** The home's or place's name, and the wins a place needs. */
      name: string;
      wins?: number;
      /** The hub's cards' and Multiplayer's pictures, by their keys. */
      hub: Record<HubCard, string>;
      rooms: DayAndNight;
      roomCards: Record<RoomCard, string>;
    }
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
    }
  | {
      kind: "character";
      character: SpineCharacter;
      /** The face to wear. */
      face: string;
      /** Lines for her eyes and middle, and her pat circle. */
      guides: boolean;
    };

export interface PreviewMessage {
  type: "admin-preview";
  scheme: ColorScheme;
  view: PreviewView;
}

/** What a sprite has, for the character tab's pickers. */
export interface CharacterInfo {
  type: "admin-character-info";
  skel: string;
  animations: string[];
  bones: string[];
}

/** The frame asks for the view once it's ready for it. */
export interface PreviewReady {
  type: "admin-preview-ready";
}
