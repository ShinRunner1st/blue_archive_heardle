/**
 * Pauses every other audio element on the page when one starts playing. The
 * result screen's song and the Jukebox can both be open at once, and two songs
 * over each other is never what the player meant.
 *
 * Media events don't bubble, so the listener sits on the document in the
 * capture phase, where it sees every element's play. Returns a function that
 * takes the listener off again.
 */
export function playOneAtATime(doc: Document = document): () => void {
  const handlePlay = (event: Event) => {
    const playing = event.target;
    if (!(playing instanceof HTMLMediaElement)) return;

    doc.querySelectorAll("audio, video").forEach((element) => {
      const media = element as HTMLMediaElement;
      if (media !== playing && !media.paused) media.pause();
    });
  };

  doc.addEventListener("play", handlePlay, true);
  return () => doc.removeEventListener("play", handlePlay, true);
}
