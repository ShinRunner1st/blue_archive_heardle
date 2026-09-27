import React from "react";

import { jukeboxShelves } from "../../helpers/jukebox";
import { Song } from "../../types/song";

import { Button } from "../Button";
import { NowPlaying } from "../NowPlaying";
import { PopUp } from "../PopUp";

import * as Styled from "./index.styled";

interface Props {
  onClose: () => void;
  /** Theme numbers guessed right at least once, in any mode. */
  guessed: Set<string>;
}

const SHELVES = jukeboxShelves();
const ALL_SONGS = [...new Set(SHELVES.flatMap((shelf) => shelf.songs))];

/**
 * Every song in the game to listen to in full, by OST album. It opens only
 * from a result screen, and the page closes it when the next round starts, so
 * it can't be used to check a clip while guessing.
 *
 * A song is fetched when it is picked, from the audio Worker, which asks the
 * browser to keep it for a year: playing it again costs nothing.
 */
export function JukeboxPopUp({ onClose, guessed }: Props) {
  const [shelfId, setShelfId] = React.useState("all");
  const [playing, setPlaying] = React.useState<Song>();

  const shown =
    shelfId === "all"
      ? SHELVES
      : SHELVES.filter((shelf) => shelf.id === shelfId);
  const found = ALL_SONGS.filter((song) => guessed.has(song.themeNo)).length;

  return (
    <PopUp
      title="Jukebox 🎵"
      subtitle={`Play any song in full. The bright ones are the ${found} of ${ALL_SONGS.length} you've guessed.`}
      onClose={onClose}
      actions={
        <Button variant="green" onClick={onClose}>
          Close
        </Button>
      }
    >
      {playing ? (
        <Styled.Playing>
          <NowPlaying
            // A new card for each song, so nothing of the last one carries over.
            key={playing.themeNo}
            song={playing}
            startTime={0}
            // Space belongs to the buttons in the pop-up.
            keyboardEnabled={false}
          />
        </Styled.Playing>
      ) : (
        <Styled.Idle>Pick a song to play it.</Styled.Idle>
      )}

      <Styled.Shelves role="group" aria-label="Album">
        <Styled.Chip
          type="button"
          aria-pressed={shelfId === "all"}
          $active={shelfId === "all"}
          onClick={() => setShelfId("all")}
        >
          All
        </Styled.Chip>
        {SHELVES.map((shelf) => (
          <Styled.Chip
            key={shelf.id}
            type="button"
            aria-pressed={shelfId === shelf.id}
            $active={shelfId === shelf.id}
            onClick={() => setShelfId(shelf.id)}
          >
            {shelf.label}
          </Styled.Chip>
        ))}
      </Styled.Shelves>

      <Styled.List>
        <Styled.Songs>
          {shown.map((shelf) => (
            <React.Fragment key={shelf.id}>
              <li>
                <Styled.ShelfHeading>
                  {shelf.label}
                  <Styled.ShelfTitle>
                    {shelf.title && `~${shelf.title}~`}
                  </Styled.ShelfTitle>
                  <Styled.ShelfCount>
                    {shelf.songs.filter((s) => guessed.has(s.themeNo)).length}
                    {" / "}
                    {shelf.songs.length}
                  </Styled.ShelfCount>
                </Styled.ShelfHeading>
              </li>
              {shelf.songs.map((song) => {
                const isPlaying = playing?.themeNo === song.themeNo;

                return (
                  <li key={`${shelf.id}-${song.themeNo}`}>
                    <Styled.SongButton
                      type="button"
                      onClick={() => setPlaying(song)}
                      aria-pressed={isPlaying}
                      $bright={guessed.has(song.themeNo)}
                      $selected={isPlaying}
                    >
                      <Styled.NameCell>
                        <Styled.SongName>{song.name}</Styled.SongName>
                        {isPlaying && <Styled.NowIcon aria-hidden="true" />}
                      </Styled.NameCell>
                      <Styled.ThemeNo>
                        {song.name !== `Theme ${song.themeNo}` && song.themeNo}
                      </Styled.ThemeNo>
                      <Styled.ArtistTag title={song.artist}>
                        {song.artist}
                      </Styled.ArtistTag>
                    </Styled.SongButton>
                  </li>
                );
              })}
            </React.Fragment>
          ))}
        </Styled.Songs>
      </Styled.List>
    </PopUp>
  );
}
