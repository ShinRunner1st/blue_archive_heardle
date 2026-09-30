import { pickName, places, standings } from "../../helpers/roomView";
import { ClientMessage, OVER_MS, PlayerView, RoomView } from "../../types/room";

import { Button } from "../Button";
import { StudentIcon } from "../StudentIcon";

import { Avatar } from "./PlayerList";
import * as Styled from "./index.styled";
import { useNow, useTickAt } from "./useRoomClock";

const MEDALS = ["🥇", "🥈", "🥉"];
/** The podium's order across the screen: second, first, third. */
const PODIUM_ORDER = [1, 0, 2];

const ORDINALS = ["1st", "2nd", "3rd"];
const ordinal = (place: number) => ORDINALS[place - 1] ?? `${place}th`;

/** A player's total, to the hundredth: two a tenth apart can hold two places. */
function score(player: PlayerView): string {
  return player.score > 0
    ? `${player.score} right · ${(player.time / 1000).toFixed(2)}s`
    : "0 right";
}

interface Props {
  view: RoomView;
  receivedAt: number;
  send: (message: ClientMessage) => void;
  onLeave: () => void;
}

/**
 * After the last round: the top three on a podium, if they named one,
 * everyone else under it (a tie on answers and time shares a place), and
 * every answer with who named it. Each player goes back to the lobby when they like, and after
 * OVER_MS the room takes everyone still here.
 */
export function Standings({ view, receivedAt, send, onLeave }: Props) {
  const now = useNow();
  const place = places(view.players);
  const ordered = standings(view.players);
  const winners = ordered.filter((p) => place.get(p.id) === 1 && p.score > 0);
  const youWon = winners.some((p) => p.id === view.you);
  const me = view.players.find((p) => p.id === view.you);
  const yourPlace = me && me.score > 0 ? place.get(me.id) : undefined;
  const byId = new Map(view.players.map((p) => [p.id, p]));

  // The room has no timer: the pages tell it the standings' time is up.
  const endAt = view.endsIn === null ? null : receivedAt + view.endsIn;
  useTickAt(send, `over:${view.results.length}`, endAt);
  const left = endAt === null ? 0 : Math.max(0, endAt - now);

  // Only those who named one stand on the podium.
  const top = ordered.filter((p) => p.score > 0).slice(0, 3);
  // Each keeps their column, so a winner alone stands in the middle.
  const podium = PODIUM_ORDER.flatMap((index, column) =>
    top[index] ? [{ player: top[index], column: column + 1 }] : []
  );
  const rest = ordered.filter((p) => !top.includes(p));

  return (
    <>
      <Styled.Title>
        {youWon
          ? "You win, Sensei! 🏆"
          : yourPlace && yourPlace <= 3
          ? `${ordinal(yourPlace)} place, Sensei! ${MEDALS[yourPlace - 1]}`
          : "Final standings 🏆"}
      </Styled.Title>
      <Styled.Lead>
        {winners.length === 0
          ? "Nobody named one this time."
          : `${winners.map((p) => p.name).join(" and ")} named ${
              winners[0].score
            } of ${view.results.length}.`}
      </Styled.Lead>

      {podium.length > 0 && (
        <Styled.Podium aria-label="Top three">
          {podium.map(({ player, column }) => {
            const at = place.get(player.id)!;
            return (
              <Styled.PodiumSpot
                key={player.id}
                $place={at}
                $column={column}
                $you={player.id === view.you}
              >
                <Styled.PodiumFace>
                  <Avatar
                    icon={player.icon}
                    name={player.name}
                    size={at === 1 ? 60 : 48}
                  />
                  <Styled.PodiumMedal aria-hidden="true">
                    {MEDALS[at - 1] ?? at}
                  </Styled.PodiumMedal>
                </Styled.PodiumFace>
                <Styled.PodiumName title={player.name}>
                  {player.name}
                </Styled.PodiumName>
                <Styled.PodiumScore>{score(player)}</Styled.PodiumScore>
                <Styled.PodiumBlock
                  $place={at}
                  aria-label={`${ordinal(at)} place`}
                >
                  {at}
                </Styled.PodiumBlock>
              </Styled.PodiumSpot>
            );
          })}
        </Styled.Podium>
      )}

      {rest.length > 0 && (
        <Styled.Places aria-label="Everyone else">
          {rest.map((player) => (
            <Styled.PlaceRow key={player.id} $you={player.id === view.you}>
              <Styled.PlaceNo>
                {player.score > 0 ? place.get(player.id) : "–"}
              </Styled.PlaceNo>
              <Avatar icon={player.icon} name={player.name} size={28} />
              <Styled.PlaceName title={player.name}>
                {player.name}
              </Styled.PlaceName>
              <Styled.PlaceScore>{score(player)}</Styled.PlaceScore>
            </Styled.PlaceRow>
          ))}
        </Styled.Places>
      )}

      <Styled.BackBar aria-live="off">
        <span>
          Everyone goes back to the lobby in {Math.ceil(left / 1000)}s
        </span>
        <Styled.BackTrack aria-hidden="true">
          <span style={{ width: `${Math.min(1, left / OVER_MS) * 100}%` }} />
        </Styled.BackTrack>
      </Styled.BackBar>
      <Styled.Buttons>
        <Button stroke variant="orange" onClick={onLeave}>
          Leave
        </Button>
        <Button stroke variant="green" onClick={() => send({ t: "again" })}>
          Back to the lobby
        </Button>
      </Styled.Buttons>

      {view.results.length > 0 && (
        <Styled.Rounds aria-label="Every answer">
          {view.results.map((result, index) => (
            <Styled.RoundRow key={index}>
              <Styled.PlaceNo $right={result.right.length > 0}>
                {index + 1}
              </Styled.PlaceNo>
              {view.settings.game !== "ost" && (
                <StudentIcon id={Number(result.answer)} size={24} />
              )}
              <Styled.PlaceName>
                {pickName(view.settings, result.answer)}
              </Styled.PlaceName>
              <Styled.WhoNamed
                aria-label={
                  result.right.length === 0
                    ? "Nobody named it"
                    : `Named by ${result.right
                        .map((id) => byId.get(id)?.name ?? "?")
                        .join(", ")}`
                }
              >
                {result.right.length === 0 ? (
                  <Styled.Nobody>nobody</Styled.Nobody>
                ) : (
                  result.right.map((id) => {
                    const player = byId.get(id);
                    return player ? (
                      <span key={id} title={player.name}>
                        <Avatar
                          icon={player.icon}
                          name={player.name}
                          size={20}
                        />
                      </span>
                    ) : null;
                  })
                )}
              </Styled.WhoNamed>
            </Styled.RoundRow>
          ))}
        </Styled.Rounds>
      )}
    </>
  );
}
