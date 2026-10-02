import React from "react";

import { fetchVerified } from "../../helpers/accountClient";
import { dateOfDay } from "../../helpers/daily";
import { formatClock } from "../../helpers/timeAttack";
import { VERIFIED_DAILIES, VerifiedDaily } from "../../helpers/verifiedDaily";
import { SERVER_NAMES, Server } from "../../types/server";
import { VerifiedDailyStats, VerifiedView } from "../../types/verified";

import * as Styled from "./index.styled";

type State =
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "shown"; view: VerifiedView }
  | { status: "unreachable" };

/** What verified means, in a sentence or two (section 1). */
const ABOUT =
  "Verified results are dailies your account started before you played " +
  "and judged itself, and room games the room signed: apart from this " +
  "browser's record, never from a save file or an import. They stop " +
  "made-up and replayed results, not looking an answer up.";

const GAME_NAMES: Record<string, string> = {
  ost: "OST",
  voice: "Voice",
  halo: "Halo",
  weapon: "Weapon",
  gameplay: "Students · Gameplay",
  lore: "Students · Lore",
};

/** "Voice (JP)"; the OST has one daily for both servers. */
export function dailyName(daily: VerifiedDaily): string {
  const [game, server] = daily.split(".") as [string, Server | undefined];
  return server
    ? `${GAME_NAMES[game]} (${SERVER_NAMES[server]})`
    : GAME_NAMES[game];
}

const isStudents = (daily: VerifiedDaily) =>
  daily.startsWith("gameplay") || daily.startsWith("lore");

const percent = (won: number, played: number) =>
  played === 0 ? "–" : `${Math.round((won / played) * 100)}%`;

const number = (value: number) => value.toLocaleString("en-US");

const dayDate = (day: number) =>
  dateOfDay(day).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

function Tile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Styled.Tile>
      <Styled.TileLabel>{label}</Styled.TileLabel>
      <Styled.TileValue>{value}</Styled.TileValue>
      {sub && <Styled.TileSub>{sub}</Styled.TileSub>}
    </Styled.Tile>
  );
}

/**
 * The profile's Verified tab (docs/verified-stats.md, section 9): the
 * record the account keeps itself, read once as the tab first opens and
 * kept while the profile is open. Nothing here comes from this browser's
 * saves, whose record the other tabs show, and nothing goes back to them.
 */
export function VerifiedPanel() {
  const [state, setState] = React.useState<State>({ status: "loading" });
  const [asked, setAsked] = React.useState(0);

  React.useEffect(() => {
    let live = true;
    fetchVerified()
      .then((view) => {
        if (!live) return;
        setState(view ? { status: "shown", view } : { status: "signedOut" });
      })
      .catch(() => {
        if (live) setState({ status: "unreachable" });
      });
    return () => {
      live = false;
    };
  }, [asked]);

  if (state.status === "loading") {
    return <Styled.Note>Loading your verified record…</Styled.Note>;
  }
  if (state.status === "signedOut") {
    return (
      <Styled.AccountPanel>
        <Styled.AccountLead>
          Sign in on the Account tab to keep a verified record: dailies your
          account starts before you play and judges itself.
        </Styled.AccountLead>
      </Styled.AccountPanel>
    );
  }
  if (state.status === "unreachable") {
    return (
      <Styled.AccountPanel>
        <Styled.AccountLead>
          {"Your account couldn't be reached. Your verified record is kept " +
            "there, safe."}
        </Styled.AccountLead>
        <Styled.AccountButtons>
          <Styled.AccountButton
            type="button"
            onClick={() => {
              setState({ status: "loading" });
              setAsked((n) => n + 1);
            }}
          >
            Try again
          </Styled.AccountButton>
        </Styled.AccountButtons>
      </Styled.AccountPanel>
    );
  }

  const { view } = state;
  const played = VERIFIED_DAILIES.filter((daily) => view.dailies[daily]);
  const rooms = view.rooms;
  const topThree = rooms
    ? [1, 2, 3].reduce((sum, place) => sum + (rooms.places[place] ?? 0), 0)
    : 0;
  const totals = played.reduce(
    (sum, daily) => ({
      played: sum.played + view.dailies[daily].played,
      won: sum.won + view.dailies[daily].won,
    }),
    { played: 0, won: 0 }
  );

  return (
    <>
      <Styled.Note>
        {view.since === null
          ? "Nothing verified yet."
          : `Verified since ${dayDate(view.since)}.`}{" "}
        {ABOUT}
      </Styled.Note>

      {view.since !== null && (
        <Styled.Tiles>
          <Tile label="Dailies played" value={number(totals.played)} />
          <Tile
            label="Dailies won"
            value={percent(totals.won, totals.played)}
          />
          <Tile
            label="Room games"
            value={number(rooms?.played ?? 0)}
            sub={
              rooms
                ? `${rooms.first} first, ${topThree} in the top three`
                : undefined
            }
          />
        </Styled.Tiles>
      )}

      {played.map((daily) => (
        <VerifiedGame key={daily} daily={daily} stats={view.dailies[daily]} />
      ))}
    </>
  );
}

function VerifiedGame({
  daily,
  stats,
}: {
  daily: VerifiedDaily;
  stats: VerifiedDailyStats;
}) {
  const students = isStudents(daily);
  const bars = [
    ...Object.entries(stats.spread)
      .map(([tries, count]) => ({ label: tries, count, lost: false }))
      .sort((a, b) => Number(a.label) - Number(b.label)),
    ...(stats.lost + stats.abandoned > 0
      ? [{ label: "✗", count: stats.lost + stats.abandoned, lost: true }]
      : []),
  ];
  const most = Math.max(1, ...bars.map((bar) => bar.count));
  return (
    <Styled.Game>
      <Styled.Heading>{dailyName(daily)}</Styled.Heading>
      <Styled.Tiles>
        <Tile
          label="Played"
          value={number(stats.played)}
          sub={
            stats.abandoned
              ? `${stats.abandoned} not finished in time`
              : undefined
          }
        />
        <Tile label="Won" value={percent(stats.won, stats.played)} />
        <Tile
          label="Streak"
          value={String(stats.streak)}
          sub={`best ${stats.bestStreak}`}
        />
        {students && (
          <Tile
            label="Fastest find"
            value={stats.bestTime === null ? "–" : formatClock(stats.bestTime)}
          />
        )}
      </Styled.Tiles>
      {bars.length > 0 && (
        <>
          <Styled.SubHeading>
            By {students ? "guesses" : "tries"}
          </Styled.SubHeading>
          <Styled.Spread>
            {bars.map((bar) => (
              <Styled.SpreadRow key={bar.label}>
                <Styled.SpreadLabel>{bar.label}</Styled.SpreadLabel>
                <Styled.SpreadBar
                  $lost={bar.lost}
                  style={{ width: `${Math.max(6, (bar.count / most) * 100)}%` }}
                >
                  {bar.count}
                </Styled.SpreadBar>
              </Styled.SpreadRow>
            ))}
          </Styled.Spread>
        </>
      )}
      <Styled.Note>Since {dayDate(stats.firstDay)}.</Styled.Note>
    </Styled.Game>
  );
}
