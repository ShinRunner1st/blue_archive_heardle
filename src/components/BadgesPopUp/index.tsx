import { Button } from "../Button";
import { PopUp, PopUpMeta } from "../PopUp";
import { BadgeProgress } from "../../helpers/badges";

import * as Styled from "./index.styled";

interface Props {
  onClose: () => void;
  /** The OST badges, from both modes. */
  badges: BadgeProgress[];
}

function subtitleFor(badges: BadgeProgress[]): string {
  const earned = badges.filter((badge) => badge.done).length;
  if (earned === badges.length)
    return "Every album complete. Well done, Sensei!";
  return `${earned} of ${badges.length} earned.`;
}

/** The eight soundtrack albums, each a badge earned by guessing all of it. */
export function BadgesPopUp({ onClose, badges }: Props) {
  return (
    <PopUp
      title="OST badges 💿"
      subtitle={subtitleFor(badges)}
      onClose={onClose}
      actions={
        <Button variant="green" onClick={onClose}>
          Close
        </Button>
      }
    >
      <Styled.Shelf>
        {badges.map(({ volume, found, total, done }) => (
          <Styled.Badge
            key={volume.number}
            $done={done}
            aria-label={`Original Soundtrack Vol.${volume.number}: ${
              done ? "complete" : `${found} of ${total} songs guessed`
            }`}
          >
            <Styled.Cover
              src={volume.cover}
              alt=""
              $done={done}
              loading="lazy"
            />
            <Styled.Info>
              <Styled.Name>
                Vol.{volume.number}
                <Styled.Count $done={done}>
                  {done ? "✓ Earned" : `${found} / ${total}`}
                </Styled.Count>
              </Styled.Name>
              <Styled.Album>~{volume.title}~</Styled.Album>
              <Styled.Track aria-hidden="true">
                <Styled.Fill
                  $done={done}
                  style={{ width: `${(found / total) * 100}%` }}
                />
              </Styled.Track>
            </Styled.Info>
          </Styled.Badge>
        ))}
      </Styled.Shelf>

      <PopUpMeta>
        Guess every song on an album, in either mode, to earn its badge.
      </PopUpMeta>
    </PopUp>
  );
}
