/**
 * Small pure helpers for editing the content in the admin tool: ids from
 * names, moving and replacing items in lists, and which files changed.
 */
import type { ContentFileName, ContentFiles } from "../content/types";

/** An id from a name: lower case, words joined by hyphens. */
export function slugOf(name: string, max = 32): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/, "");
}

/** `base`, or `base-2`, `base-3`... whichever isn't taken. */
export function freeId(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const start = base || "new";
  if (!used.has(start)) return start;
  for (let n = 2; ; n++) {
    if (!used.has(`${start}-${n}`)) return `${start}-${n}`;
  }
}

/** The list with the item at `from` moved to `to`. */
export function moved<T>(list: readonly T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return [...list];
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * Moves an item one step among those `inside` picks (a mission among its
 * tab's), past the others in the list, which keep their places.
 */
export function stepped<T>(
  list: readonly T[],
  item: T,
  step: -1 | 1,
  inside: (other: T) => boolean
): T[] {
  const from = list.indexOf(item);
  if (from < 0) return [...list];
  let to = from + step;
  while (to >= 0 && to < list.length && !inside(list[to])) to += step;
  if (to < 0 || to >= list.length) return [...list];
  const next = [...list];
  next[from] = list[to];
  next[to] = item;
  return next;
}

/** The list with `item` in place of `old`. */
export function replaced<T>(list: readonly T[], old: T, item: T): T[] {
  return list.map((other) => (other === old ? item : other));
}

/** The files whose contents differ between two copies. */
export function changedFiles(
  saved: ContentFiles,
  draft: ContentFiles
): ContentFileName[] {
  return (Object.keys(draft) as ContentFileName[]).filter(
    (name) => JSON.stringify(saved[name]) !== JSON.stringify(draft[name])
  );
}
