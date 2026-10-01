import React from "react";

import { MISSIONS } from "../../constants/missions";
import { ProfileGame, profileStats } from "../../helpers/profileStats";
import { SERVER_NAMES } from "../../types/server";
import { formatClock } from "../../helpers/timeAttack";
import { useMissionsVersion } from "../../hooks/useMissions";
import { useServer } from "../../hooks/useServer";

import { PopUp } from "../PopUp";

import { CustomizePopUp } from "./Customize";
import { currentLook } from "./PlayerCard";
import { ProfileHero } from "./ProfileCard";
import { ProfileFrame } from "./ProfileFrame";
import * as Styled from "./index.styled";

type Tab = "overview" | "ost" | "voice" | "picture" | "students" | "room";

const TABS: Array<{ id: Tab; label: string; games: ProfileGame["id"][] }> = [
  { id: "overview", label: "Overview", games: [] },
  { id: "ost", label: "OST", games: ["ost"] },
  { id: "voice", label: "Voice", games: ["voice"] },
  { id: "picture", label: "Picture", games: ["halo", "weapon"] },
  { id: "students", label: "Students", games: ["gameplay", "lore"] },
  { id: "room", label: "Multiplayer", games: [] },
];

const percent = (won: number, played: number) =>
  played === 0 ? "–" : `${Math.round((won / played) * 100)}%`;

const oneDecimal = (value: number | null) =>
  value === null ? "–" : value.toFixed(1);

const number = (value: number) => value.toLocaleString("en-US");

interface Props {
  onClose: () => void;
  onSenseiCard: () => void;
}

/**
 * The player's profile, from this browser's saves: their card (the
 * cosmetics they picked), the totals, and each game's record, by way to
 * play. Customize swaps in for it, and back. Others see it in a room once
 * accounts arrive.
 */
export default function ProfilePopUp({ onClose, onSenseiCard }: Props) {
  useMissionsVersion();
  const server = useServer();
  const stats = React.useMemo(() => profileStats(undefined, server), [server]);
  const [tab, setTab] = React.useState<Tab>("overview");
  const [customizing, setCustomizing] = React.useState(false);

  if (customizing) {
    return <CustomizePopUp onClose={() => setCustomizing(false)} />;
  }

  const look = currentLook();
  const since = stats.since?.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const shown = TABS.find(({ id }) => id === tab)!;

  return (
    <PopUp
      wide
      bleed
      title="Profile"
      onClose={onClose}
      frame={(panel) => (
        <ProfileFrame frame={look.frame} popUp>
          {panel}
        </ProfileFrame>
      )}
    >
      <ProfileHero
        look={look}
        actions={
          <>
            <Styled.HeroAction type="button" onClick={onSenseiCard}>
              Sensei card
            </Styled.HeroAction>
            <Styled.HeroAction
              type="button"
              onClick={() => setCustomizing(true)}
            >
              Customize
            </Styled.HeroAction>
          </>
        }
      >
        <Styled.Meta>
          {since ? `Playing since ${since}` : "New to Schale"}
          {` · ${stats.daysPlayed} ${
            stats.daysPlayed === 1 ? "day" : "days"
          } played`}
          {` · ${SERVER_NAMES[server]}`}
        </Styled.Meta>
      </ProfileHero>
      <Styled.Body>
        <Styled.Tabs role="tablist" aria-label="Profile">
          {TABS.map(({ id, label }) => (
            <Styled.Tab
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              $active={tab === id}
              onClick={() => setTab(id)}
            >
              {label}
            </Styled.Tab>
          ))}
        </Styled.Tabs>

        <div role="tabpanel" aria-label={shown.label}>
          {tab === "overview" ? (
            <Overview stats={stats} />
          ) : tab === "room" ? (
            <Styled.Tiles>
              <Tile label="Games played" value={number(stats.room.games)} />
              <Tile label="First places" value={number(stats.room.wins)} />
              <Tile
                label="Won"
                value={percent(stats.room.wins, stats.room.games)}
              />
              <Styled.Note>
                Counted in this browser: games seen to the standings.
              </Styled.Note>
            </Styled.Tiles>
          ) : (
            stats.games
              .filter((game) => shown.games.includes(game.id))
              .map((game) => <GameDetail key={game.id} game={game} />)
          )}
        </div>
      </Styled.Body>
    </PopUp>
  );
}

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

function Overview({ stats }: { stats: ReturnType<typeof profileStats> }) {
  return (
    <>
      <Styled.Tiles>
        <Tile label="Rounds played" value={number(stats.roundsPlayed)} />
        <Tile label="Days played" value={number(stats.daysPlayed)} />
        <Tile label="Dailies won" value={number(stats.dailiesWon)} />
        <Tile label="Best daily streak" value={String(stats.bestDailyStreak)} />
        <Tile label="Best win streak" value={String(stats.bestWinStreak)} />
        <Tile
          label="Songs guessed"
          value={number(stats.songsGuessed)}
          sub={`of ${stats.songsTotal}`}
        />
        <Tile
          label="Students found"
          value={number(stats.studentsFound)}
          sub={`of ${stats.studentsTotal}`}
        />
        <Tile
          label="Missions"
          value={`${stats.missionsCleared}/${MISSIONS.length}`}
        />
        <Tile
          label="OST badges"
          value={`${stats.badgesEarned}/${stats.badgesTotal}`}
        />
        <Tile
          label="Room games"
          value={number(stats.room.games)}
          sub={`${stats.room.wins} first places`}
        />
      </Styled.Tiles>

      <Styled.Heading>By game</Styled.Heading>
      <Styled.TableWrap>
        <Styled.Table>
          <thead>
            <tr>
              <th scope="col">Game</th>
              <th scope="col">Played</th>
              <th scope="col">Won</th>
              <th scope="col">Daily streak</th>
              <th scope="col">Avg. tries</th>
              <th scope="col">Best Time Attack</th>
            </tr>
          </thead>
          <tbody>
            {stats.games.map((game) => (
              <tr key={game.id}>
                <th scope="row">{game.name}</th>
                <td>{number(game.played)}</td>
                <td>{percent(game.won, game.played)}</td>
                <td>
                  {game.daily.current} / {game.daily.best}
                </td>
                <td>{oneDecimal(game.averageTries)}</td>
                <td>
                  {game.timeAttack
                    ? game.timeAttack.runs
                      ? String(game.timeAttack.best)
                      : "–"
                    : game.fastest === null
                    ? "–"
                    : `${formatClock(game.fastest)} find`}
                </td>
              </tr>
            ))}
          </tbody>
        </Styled.Table>
      </Styled.TableWrap>
      <Styled.Note>
        Daily streak is now / best. Tries count guesses in the student game.
      </Styled.Note>
    </>
  );
}

function GameDetail({ game }: { game: ProfileGame }) {
  const most = Math.max(1, ...game.spread.map((bar) => bar.count));
  const isStudents = game.timeAttack === null;
  return (
    <Styled.Game>
      <Styled.Heading>{game.name}</Styled.Heading>
      <Styled.Tiles>
        <Tile label="Played" value={number(game.played)} />
        <Tile label="Won" value={percent(game.won, game.played)} />
        <Tile
          label="Daily streak"
          value={String(game.daily.current)}
          sub={`best ${game.daily.best}`}
        />
        <Tile
          label={isStudents ? "Avg. guesses" : "Avg. tries"}
          value={oneDecimal(game.averageTries)}
        />
        {isStudents ? (
          <>
            <Tile
              label="Fastest find"
              value={game.fastest === null ? "–" : formatClock(game.fastest)}
            />
            <Tile
              label="Average find"
              value={
                game.averageTime === null ? "–" : formatClock(game.averageTime)
              }
            />
          </>
        ) : (
          <Tile
            label="Best Time Attack"
            value={game.timeAttack?.runs ? String(game.timeAttack.best) : "–"}
            sub={
              game.timeAttack?.runs
                ? `${game.timeAttack.runs} runs, ${game.timeAttack.answered} answered`
                : undefined
            }
          />
        )}
      </Styled.Tiles>

      <Styled.GameColumns>
        <div>
          <Styled.SubHeading>Ways to play</Styled.SubHeading>
          <Styled.TableWrap>
            <Styled.Table>
              <thead>
                <tr>
                  <th scope="col">Way to play</th>
                  <th scope="col">Played</th>
                  <th scope="col">Won</th>
                  <th scope="col">Best run</th>
                </tr>
              </thead>
              <tbody>
                {game.modes.map((mode) => (
                  <tr key={mode.label}>
                    <th scope="row">{mode.label}</th>
                    <td>{number(mode.played)}</td>
                    <td>{percent(mode.won, mode.played)}</td>
                    <td>{mode.bestRun}</td>
                  </tr>
                ))}
              </tbody>
            </Styled.Table>
          </Styled.TableWrap>
        </div>
        <div>
          <Styled.SubHeading>
            Daily puzzles, by {isStudents ? "guesses" : "tries"}
          </Styled.SubHeading>
          <Styled.Spread>
            {game.spread.map((bar) => (
              <Styled.SpreadRow key={bar.label}>
                <Styled.SpreadLabel>{bar.label}</Styled.SpreadLabel>
                <Styled.SpreadBar
                  $lost={bar.lost === true}
                  style={{ width: `${Math.max(6, (bar.count / most) * 100)}%` }}
                >
                  {bar.count}
                </Styled.SpreadBar>
              </Styled.SpreadRow>
            ))}
          </Styled.Spread>
        </div>
      </Styled.GameColumns>
    </Styled.Game>
  );
}
