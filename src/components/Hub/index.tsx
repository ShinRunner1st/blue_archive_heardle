import React from "react";
import { IoArrowForward, IoCheckmark, IoClose, IoTime } from "react-icons/io5";

import { PAGES } from "../../constants/pages";
import { pictureFiles } from "../../constants/pictureFiles";
import { audioBaseUrl, backupUrlFor } from "../../helpers/audioUrl";
import {
  dayNumber,
  formatCountdown,
  msUntilNextDay,
} from "../../helpers/daily";
import { setServer } from "../../helpers/server";
import { isFirstRun, loadGame } from "../../helpers/storage";
import { useServer } from "../../hooks/useServer";
import { SERVER_NAMES, SERVERS } from "../../types/server";
import { DailyResult, todayResults } from "../../helpers/todayResults";
import { isPlainClick } from "../../hooks/usePage";
import { Game } from "../../types/mode";
import { PAGE_LINKS } from "../PlayStyles";

import { Birthdays } from "./Birthdays";
import { GlobalNow } from "./GlobalNow";
import { Record } from "./Record";
import * as Styled from "./index.styled";

interface GameCard {
  game: Game;
  /** What the player names, and from what. */
  blurb: string;
  /** The ways to play, in a few words. */
  modes: string;
}

const CARDS: GameCard[] = [
  {
    game: "ost",
    blurb: "Name the song from a short clip. Each miss plays a little more.",
    modes: "Daily · Classic · 4-Choice · Time Attack",
  },
  {
    game: "voice",
    blurb:
      "Name the student from a voice line, with their school, club and silhouette as hints.",
    modes: "Daily · Classic · 4-Choice · Time Attack",
  },
  {
    game: "picture",
    blurb: "Name the student from their halo or weapon, or only its shape.",
    modes: "Daily · Classic · 4-Choice · Time Attack",
  },
  {
    game: "students",
    blurb:
      "Name the student: each guess shows how their school, role, weapon and more compare.",
    modes: "Daily · Endless · Gameplay or Lore",
  },
];

/** Today's daily puzzle in a game, or one of its two, as a chip. */
function Status({ result }: { result: DailyResult }) {
  const { label, state, used, tries } = result;
  const text =
    state === "won"
      ? tries
        ? `${used}/${tries}`
        : `${used} ${used === 1 ? "guess" : "guesses"}`
      : state === "lost"
      ? "missed"
      : state === "playing"
      ? "in progress"
      : label
      ? "new"
      : "new puzzle";

  return (
    <Styled.Status $state={state}>
      {state === "won" && <IoCheckmark aria-hidden="true" />}
      {state === "lost" && <IoClose aria-hidden="true" />}
      {label && <Styled.StatusLabel>{label}</Styled.StatusLabel>}
      {label ? text : text[0].toUpperCase() + text.slice(1)}
    </Styled.Status>
  );
}

/**
 * One of the game's scenes behind a card (pictures/hub/, made by
 * scripts/make-card.mjs), from the Worker, or its copy on R2 if the Worker
 * fails; the card is plain if both do.
 */
function CardArt({ game }: { game: Game }) {
  const file = pictureFiles[`hub/${game}`];
  const [src, setSrc] = React.useState(
    file ? `${audioBaseUrl()}/${file}` : null
  );
  if (!src) return null;
  return (
    <Styled.Art
      src={src}
      alt=""
      onError={() => {
        const backup = backupUrlFor(src);
        setSrc(backup && backup !== src ? backup : null);
      }}
    />
  );
}

interface Props {
  onOpen: (game: Game) => void;
  onSenseiCard: () => void;
}

/**
 * The home page: what the site is, and a card for each game with today's
 * daily puzzle as the player left it. Each card is a link to the game's own
 * page, which a plain click opens in place.
 */
export function Hub({ onOpen, onSenseiCard }: Props) {
  const server = useServer();
  // Read once each time the hub shows: coming back from a game brings them
  // up to date. A new player has no game to continue.
  const results = React.useMemo(() => todayResults(), []);
  const lastGame = React.useMemo(
    () => (isFirstRun() ? undefined : loadGame()),
    []
  );
  const day = dayNumber();

  const [remaining, setRemaining] = React.useState(msUntilNextDay);
  React.useEffect(() => {
    const id = window.setInterval(() => setRemaining(msUntilNextDay()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const linkProps = (game: Game) => ({
    href: PAGES[game].path,
    onClick: (event: React.MouseEvent) => {
      if (!isPlainClick(event)) return;
      event.preventDefault();
      onOpen(game);
    },
  });

  const last = PAGE_LINKS.find((link) => link.value === lastGame);

  return (
    <Styled.Hub>
      <Styled.Intro>
        Guessing games for Blue Archive Sensei: name the song from its
        soundtrack, or the student from their voice, their halo or weapon, or a
        few clues. A new daily puzzle in each, and endless play.
      </Styled.Intro>

      {last && (
        <Styled.Continue {...linkProps(last.value as Game)}>
          {last.icon}
          Continue: {last.label}
          <IoArrowForward aria-hidden="true" />
        </Styled.Continue>
      )}

      <Styled.Today>
        <IoTime aria-hidden="true" />
        Daily #{day} · next in {formatCountdown(remaining)}
      </Styled.Today>

      <Styled.ServerRow>
        <span id="hub-server">Students, Voice and Picture on</span>
        <Styled.ServerChoices role="radiogroup" aria-labelledby="hub-server">
          {SERVERS.map((value) => (
            <Styled.ServerChoice
              key={value}
              type="button"
              role="radio"
              aria-checked={server === value}
              $active={server === value}
              title={
                value === "jp"
                  ? "JP's students, a few months ahead of Global"
                  : "Global's students"
              }
              onClick={() => setServer(value)}
            >
              {SERVER_NAMES[value]}
            </Styled.ServerChoice>
          ))}
        </Styled.ServerChoices>
      </Styled.ServerRow>

      <Styled.Cards>
        {CARDS.map((card) => {
          const link = PAGE_LINKS.find((option) => option.value === card.game);
          return (
            <li key={card.game}>
              <Styled.Card $game={card.game} {...linkProps(card.game)}>
                <CardArt game={card.game} />
                <Styled.CardHead>
                  <Styled.Icon $game={card.game}>{link?.icon}</Styled.Icon>
                  <Styled.Name>{link?.label}</Styled.Name>
                  <Styled.Go aria-hidden="true" />
                </Styled.CardHead>
                <Styled.Blurb>{card.blurb}</Styled.Blurb>
                <Styled.Modes>{card.modes}</Styled.Modes>
                <Styled.Statuses>
                  <Styled.TodayLabel>Today</Styled.TodayLabel>
                  {results[card.game].map((result, index) => (
                    <Status key={index} result={result} />
                  ))}
                </Styled.Statuses>
              </Styled.Card>
            </li>
          );
        })}
      </Styled.Cards>

      <Record onSenseiCard={onSenseiCard} />

      <Styled.Panels>
        <GlobalNow />
        <Birthdays />
      </Styled.Panels>
    </Styled.Hub>
  );
}
