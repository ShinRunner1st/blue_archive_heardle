/**
 * What the admin tool may add as a character: shared by the page and its
 * server, which checks again before it runs anything.
 */

export interface CharacterRequest {
  /** Her id: public/spine/<id>/, and the key in characters.json. */
  id: string;
  /** A sprite in .cache/game/sprites/, by its name without _spr; or */
  sprite?: string;
  /** her .skel, .atlas and .png files, as data URLs. */
  upload?: Array<{ name: string; data: string }>;
}

const ID = /^[a-z][a-z0-9-]{0,30}$/;
const SPRITE = /^[A-Za-z0-9_]+$/;
const FILE = /^[A-Za-z0-9_.-]+\.(skel|atlas|png)$/;

/** What's wrong with a request, or null. */
export function characterProblem(request: CharacterRequest): string | null {
  if (!ID.test(request.id)) {
    return "An id is small letters, numbers and hyphens, starting with a letter.";
  }
  if (["auto", "off"].includes(request.id)) {
    return `"${request.id}" is a setting, not a character.`;
  }
  if (request.sprite !== undefined) {
    return SPRITE.test(request.sprite) ? null : "No such sprite.";
  }
  const files = request.upload ?? [];
  if (
    files.length < 3 ||
    !files.some(({ name }) => name.endsWith(".skel")) ||
    !files.some(({ name }) => name.endsWith(".atlas")) ||
    !files.some(({ name }) => name.endsWith(".png"))
  ) {
    return "Drop her .skel, .atlas and .png together.";
  }
  return files.every(({ name }) => FILE.test(name))
    ? null
    : "Name the files with letters, numbers, dots, hyphens and underscores.";
}
