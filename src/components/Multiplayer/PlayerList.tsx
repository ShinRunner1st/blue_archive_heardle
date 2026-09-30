import React from "react";

import { pickName, places, seconds } from "../../helpers/roomView";
import { PlayerView, RoomView } from "../../types/room";

import { StudentIcon } from "../StudentIcon";

import * as Styled from "./index.styled";

/** On the corner of the top three's cards, once they've scored. */
const MEDALS = ["🥇", "🥈", "🥉"];
/** How long Kick waits for its second press. */
const CONFIRM_MS = 3000;

/** A hue from a name, so a player without a picture keeps one colour. */
function hueOf(name: string): number {
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
    case "lobby":
      return { text: player.id === view.host ? "host" : "ready", right: null };
    case "over":
      return {
        text: player.returned ? "in lobby" : "on results",
        right: null,
      };
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
 * Everyone in the room, as cards in the order they came: they keep their
 * place all game, their score big on the right and a medal on the corner
 * for the top three. While a round plays, each card shows when its
 * player's latest answer reached the room, live. In the lobby, the free places show too, the host's
 * crown, and for the host a Kick on everyone else's.
 */
export function PlayerList({
  view,
  lobby = view.phase === "lobby",
  onKick,
}: {
  view: RoomView;
  /** Shown as the lobby, as to a player back from the standings early. */
  lobby?: boolean;
  /** The host's: takes a player out, pressed twice. */
  onKick?: (id: string) => void;
}) {
  const inLobby = lobby;
  const place = places(view.players);
  const free = inLobby
    ? Math.max(0, view.settings.maxPlayers - view.players.length)
    : 0;
  const [arming, setArming] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!arming) return;
    const timer = window.setTimeout(() => setArming(null), CONFIRM_MS);
    return () => window.clearTimeout(timer);
  }, [arming]);

  return (
    <Styled.PlayerGrid aria-label="Players">
      {view.players.map((player) => {
        const state = stateOf(player, view);
        const isYou = player.id === view.you;
        return (
          <Styled.PlayerCard
            key={player.id}
            $you={isYou}
            $away={!player.here}
            $right={view.phase === "reveal" ? state.right : null}
          >
            <Avatar icon={player.icon} name={player.name} size={32} />
            <Styled.CardName
              title={isYou ? `${player.name} (you)` : player.name}
            >
              {player.name}
            </Styled.CardName>
            <Styled.CardLine $right={state.right}>{state.text}</Styled.CardLine>
            {inLobby && onKick && !isYou && (
              <Styled.Kick
                type="button"
                $armed={arming === player.id}
                aria-label={
                  arming === player.id
                    ? `Tap again to kick ${player.name}`
                    : `Kick ${player.name}`
                }
                onClick={() => {
                  if (arming === player.id) {
                    setArming(null);
                    onKick(player.id);
                  } else {
                    setArming(player.id);
                  }
                }}
              >
                {arming === player.id ? "Kick?" : "✕"}
              </Styled.Kick>
            )}
            {!inLobby && (
              <Styled.CardScore
                $some={player.score > 0}
                aria-label={`${player.score} right`}
                title={`${player.score} right`}
              >
                {player.score}
              </Styled.CardScore>
            )}
            {inLobby
              ? player.id === view.host && (
                  <Styled.Badge aria-label="Host">👑</Styled.Badge>
                )
              : player.score > 0 &&
                (place.get(player.id) ?? 99) <= MEDALS.length && (
                  <Styled.Badge
                    aria-label={`Place ${place.get(player.id)}`}
                    $medal
                  >
                    {MEDALS[place.get(player.id)! - 1]}
                  </Styled.Badge>
                )}
          </Styled.PlayerCard>
        );
      })}
      {Array.from({ length: free }, (_, index) => (
        <Styled.PlayerCard key={`free-${index}`} $empty aria-hidden="true">
          <Styled.Letter $size={32} $hue={0} style={{ opacity: 0.25 }} />
          <Styled.CardName>Free place</Styled.CardName>
          <Styled.CardLine />
        </Styled.PlayerCard>
      ))}
    </Styled.PlayerGrid>
  );
}
