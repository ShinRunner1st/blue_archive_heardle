/**
 * What the admin tool may make, and where: shared by the page and its
 * server, which checks again before it runs anything.
 */

/**
 * How a picture is made: a blurred backdrop like the seasons' (by day or
 * night, dimmed to match), a sharp scene, or an album's square cover.
 */
export type PictureStyle =
  | "backdrop-day"
  | "backdrop-night"
  | "scene"
  | "cover";

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

/** The pictures the tool shows from the project: the Worker's and covers. */
export const VIEWABLE_PICTURE =
  /^(pictures\/[a-z]+\/[A-Za-z0-9_-]+|src\/image\/badges\/[a-z0-9-]+)\.webp$/;

const SCENE_TARGET = /^pictures\/(scenes|seasons)\/[a-z0-9-]+\.webp$/;
const COVER_TARGET = /^src\/image\/badges\/[a-z0-9-]+\.webp$/;
/** A wiki background's name, as the seasons' `scene` gives it. */
const BACKGROUND = /^[A-Za-z0-9_]+$/;

/** What's wrong with a request, or null. */
export function pictureTargetProblem(request: PictureRequest): string | null {
  const cover = request.style === "cover";
  if (
    cover
      ? !COVER_TARGET.test(request.target)
      : !SCENE_TARGET.test(request.target)
  ) {
    return cover
      ? "A cover goes in src/image/badges/, named in small letters."
      : "A picture goes in pictures/scenes/ or seasons/, named in small letters.";
  }
  if (request.upload) {
    return /^data:image\/(png|jpeg|webp|gif|avif);base64,/.test(request.upload)
      ? null
      : "Upload a PNG, JPEG, WebP, GIF or AVIF picture.";
  }
  return request.background && BACKGROUND.test(request.background)
    ? null
    : "Name a background as the wiki does, such as FireplaceDormitory.";
}
