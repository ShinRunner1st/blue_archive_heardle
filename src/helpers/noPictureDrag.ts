/**
 * Pictures can't be dragged off the page: a ghost of a cover, a portrait
 * or a hub card's scene trailing the cursor breaks the game's feel, as
 * text selection would (see index.css). Checked on the whole document, so
 * every picture is covered, wherever it's drawn. Firefox ignores CSS's
 * -webkit-user-drag, so it's stopped here. A link with a picture in it, as
 * the hub's cards, counts as a picture; a link of words still drags.
 */
export function stopPictureDrags(target: Document = document): () => void {
  const stop = (event: DragEvent) => {
    const element = event.target;
    if (!(element instanceof Element)) return;
    const link = element.closest("a");
    if (
      element instanceof HTMLImageElement ||
      element instanceof SVGElement ||
      link?.querySelector("img, svg")
    ) {
      event.preventDefault();
    }
  };
  target.addEventListener("dragstart", stop);
  return () => target.removeEventListener("dragstart", stop);
}
