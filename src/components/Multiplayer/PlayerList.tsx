import { pickName, places, seconds } from "../../helpers/roomView";
import { PlayerView, RoomView } from "../../types/room";

import { PlayerCard, roomLook } from "../Profile/PlayerCard";
import * as Card from "../Profile/card.styled";
import { StudentIcon } from "../StudentIcon";

import * as Styled from "./index.styled";

/** On the corner of the top three's cards, once they've scored. */
const MEDALS = ["🥇", "🥈", "🥉"];

/** A hue from a name, so a player without a picture keeps one colour. */
export function hueOf(name: string): number {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % 360;
}

/** A player's picture: the student they picked, or their first letter. */
export function Avatar({
  icon,
  name,
  size = 36,
}: {
  icon: number | null;
  name: string;
  size?: number;
}) {
  if (icon !== null) {
    return (
      <Styled.AvatarBox $size={size}>
        <StudentIcon id={icon} size={size} />
      </Styled.AvatarBox>
    );
  }
  return (
    <Styled.Letter $size={size} $hue={hueOf(name)} aria-hidden="true">
      {[...name][0]?.toUpperCase() ?? "?"}
    </Styled.Letter>
  );
}

/** What a player is doing, in the phase the room is in. */
function stateOf(
  player: PlayerView,
  view: RoomView
): { text: string; right: boolean | null } {
  if (!player.here) return { text: "away", right: null };
  const { phase, round } = view;
  switch (phase) {
    case "loading":
      return {
        text: player.ready >= round ? "ready" : "loading…",
        right: null,
      };
    case "playing":
      // Live: when their latest answer reached the room, never what it is.
      return {
        text:
          player.sent !== undefined
            ? seconds(player.sent)
            : player.ready >= round
            ? "thinking…"
            : "loading…",
        right: null,
      };
    case "reveal": {
      const last = player.last;
      if (!last) return { text: "", right: null };
      if (last.right) {
        return {
          text: `✓ ${last.ms === null ? "" : seconds(last.ms)}`,
          right: true,
        };
      }
      return {
        text:
          last.pick === null
            ? "no answer"
            : `✗ ${pickName(view.settings, last.pick)}`,
        right: false,
      };
    }
    default:
      return { text: "", right: null };
  }
}

/**
 * Everyone in the room during a game, on the lobby's cards made small, in
 * the order they came: they keep their place all game, the score big on
 * the right and a medal on the picture for the top three. While a round
 * plays, each card shows when its player's latest answer reached the
 * room, live, in the banner's place; at the reveal it's ringed green or
 * red.
 */
export function PlayerList({ view }: { view: RoomView }) {
  const place = places(view.players);

  return (
    <Styled.PlayerGrid aria-label="Players">
      {view.players.map((player) => {
        const state = stateOf(player, view);
        const at = place.get(player.id) ?? 99;
        return (
          <li key={player.id}>
            <PlayerCard
              look={roomLook(
                player.name,
                player.icon,
                player.id === view.you,
                player.look
              )}
              variant="mini"
              face={(size) => (
                <>
                  <Avatar icon={player.icon} name={player.name} size={size} />
                  {player.score > 0 && at <= MEDALS.length && (
                    <Styled.FaceMedal aria-label={`Place ${at}`}>
                      {MEDALS[at - 1]}
                    </Styled.FaceMedal>
                  )}
                </>
              )}
              you={player.id === view.you}
              away={!player.here}
              right={view.phase === "reveal" ? state.right : null}
              line={
                <Card.CardLine $right={state.right}>
                  {state.text || "\u00a0"}
                </Card.CardLine>
              }
              aside={
                <Styled.CardScore
                  $some={player.score > 0}
                  aria-label={`${player.score} right`}
                  title={`${player.score} right`}
                >
                  {player.score}
                </Styled.CardScore>
              }
            />
          </li>
        );
      })}
    </Styled.PlayerGrid>
  );
}
