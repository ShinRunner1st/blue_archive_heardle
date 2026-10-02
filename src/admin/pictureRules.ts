/**
 * What the admin tool may make, and where: shared by the page and its
 * server, which checks again before it runs anything.
 */

/**
 * How a picture is made: a blurred backdrop like the seasons' (by day or
 * night, dimmed to match), a sharp scene, a hub card's wide strip, a
 * banner's narrower one, an album's square cover, or an emblem's square,
 * kept transparent.
 */
export type PictureStyle =
  | "backdrop-day"
  | "backdrop-night"
  | "scene"
  | "card"
  | "banner"
  | "cover"
  | "emblem";

export interface PictureRequest {
  /** Where it goes, from the project's root. */
  target: string;
  style: PictureStyle;
  /** A picture file, as a data URL; or else */
  upload?: string;
  /** one of the game's backgrounds, by its wiki name (File:BG_<name>.jpg). */
  background?: string;
}

/** How a picture came out: from what size, to what, and how alike. */
export interface PictureMade {
  path: string;
  kb: number;
  sourceKb?: number;
  quality?: number;
  ssim?: number;
}

export interface PictureEntry {
  /** As pictureFiles.ts names it: "scenes/rooftop". */
  key: string;
  path: string;
  kb: number;
  /** In pictureFiles.ts yet. */
  listed: boolean;
}

/**
 * The pictures the tool shows from the project: the Worker's, covers, and
 * the site's own backgrounds.
 */
export const VIEWABLE_PICTURE =
  /^(pictures\/[a-z]+\/[A-Za-z0-9_-]+|src\/image\/badges\/[a-z0-9-]+|src\/image\/(backgrounds\/)?[A-Za-z0-9_-]+)\.webp$/;

/** A backdrop: the seasons' and scenes', Multiplayer's, or the site's own. */
const BACKDROP_TARGET =
  /^(pictures\/(scenes|seasons|multiplayer)|src\/image\/backgrounds)\/[a-z0-9-]+\.webp$/;
const BACKDROP_WHERE =
  "A backdrop goes in pictures/scenes/, seasons/, multiplayer/ or src/image/backgrounds/";

/** Where each style may go, and what to say when it's somewhere else. */
const TARGETS: Record<PictureStyle, [RegExp, string]> = {
  cover: [
    /^src\/image\/badges\/[a-z0-9-]+\.webp$/,
    "A cover goes in src/image/badges/",
  ],
  scene: [
    /^pictures\/(scenes|seasons)\/[a-z0-9-]+\.webp$/,
    "A picture goes in pictures/scenes/ or seasons/",
  ],
  card: [
    /^pictures\/hub\/[a-z0-9-]+\.webp$/,
    "A hub card goes in pictures/hub/",
  ],
  banner: [
    /^pictures\/scenes\/[a-z0-9-]+\.webp$/,
    "A banner's picture goes in pictures/scenes/",
  ],
  emblem: [
    /^pictures\/emblems\/[a-z0-9-]+\.webp$/,
    "An emblem's picture goes in pictures/emblems/",
  ],
  "backdrop-day": [BACKDROP_TARGET, BACKDROP_WHERE],
  "backdrop-night": [BACKDROP_TARGET, BACKDROP_WHERE],
};

/** A wiki background's name, as the seasons' `scene` gives it. */
const BACKGROUND = /^[A-Za-z0-9_]+$/;

/** What's wrong with a request, or null. */
export function pictureTargetProblem(request: PictureRequest): string | null {
  const [target, where] = TARGETS[request.style] ?? [];
  if (!target || !where) return "That isn't a way to make a picture.";
  if (!target.test(request.target)) return `${where}, named in small letters.`;
  if (request.upload) {
    return /^data:image\/(png|jpeg|webp|gif|avif);base64,/.test(request.upload)
      ? null
      : "Upload a PNG, JPEG, WebP, GIF or AVIF picture.";
  }
  return request.background && BACKGROUND.test(request.background)
    ? null
    : "Name a background as the wiki does, such as FireplaceDormitory.";
}
