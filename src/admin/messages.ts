/**
 * What the admin page tells its preview frame: the colour scheme and what
 * to draw, from the draft, so the game's own components show it as players
 * would see it.
 */
import type { ColorScheme } from "../constants/theme";
import type { CosmeticsFile, MissionsFile, NewsEntry } from "../content/types";

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
