/**
 * The pictures behind the site's pages, from src/content/page-pictures.json
 * (its README has every field).
 */
import data from "../content/page-pictures.json";
import type { PagePicturesFile } from "../content/types";

export const PAGE_PICTURES = data as PagePicturesFile;

/**
 * Every picture in src/image/ and src/image/backgrounds/, so the content
 * can name any of them: each is built into the site with its own hashed
 * name, as an import would be. A file there that nothing names still
 * ships, so the admin tool offers to delete those.
 */
const BUNDLED = import.meta.glob<string>(
  ["../image/*.webp", "../image/backgrounds/*.webp"],
  { eager: true, query: "?url", import: "default" }
);

/** A picture that ships with the site, by its path in src/image/. */
export const bundledPicture = (file: string): string =>
  BUNDLED[`../image/${file}`] ?? "";

/** The files in src/image/ the content can name, as it names them. */
export const BUNDLED_PICTURES = Object.keys(BUNDLED).map((path) =>
  path.slice("../image/".length)
);
