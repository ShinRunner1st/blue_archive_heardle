import React from "react";
import { IoGrid, IoRefresh, IoVolumeHigh } from "react-icons/io5";

import { songs } from "../../constants/songs";
import { answerOf, picturePool } from "../../helpers/pictureRounds";
import { loadQuickAnswer, saveQuickAnswer } from "../../helpers/roomClient";
import { pickName } from "../../helpers/roomView";
import { studentById } from "../../helpers/studentRounds";
import { voicePool } from "../../helpers/voiceRounds";
import {
  ClientMessage,
  GRACE_MS,
  LOAD_MS,
  Pick,
  REVEAL_MAX_MS,
  RoomView,
  SEND_GAP_MS,
  SETTLE_MS,
} from "../../types/room";
import { Song } from "../../types/song";
import { Student } from "../../types/student";

import { Button } from "../Button";
import { Choices } from "../Choices";
import * as ChoiceStyled from "../Choices/index.styled";
import { AlbumArt } from "../JukeboxPopUp/JukeboxPlayer";
import { PictureCell } from "../PictureGame/GuessPicture";
import { isTextField, Search } from "../Search";
import { BrowseButton } from "../Search/index.styled";
import { StudentListPopUp } from "../StudentGame/StudentListPopUp";
import { StudentSearch } from "../StudentGame/StudentSearch";
import { StudentIcon } from "../StudentIcon";
import { ThemeTag } from "../ThemeTag";
import * as TA from "../TimeAttack/index.styled";
import { VoiceChoices } from "../VoiceGame/VoiceParts";
import { VolumeControl } from "../VolumeControl";

import { PlayerList } from "./PlayerList";
import * as Styled from "./index.styled";
import { TICK_AFTER_MS, useNow } from "./useRoomClock";
import {
  mediaUrl,
  roomClock,
  useRoomMedia,
  useRoomSound,
} from "./useRoomMedia";

const songByTheme = new Map(songs.map((song) => [song.themeNo, song]));

/** The last seconds to answer, when the clock turns red. */
const LOW_MS = 5_000;
/** How long Leave and End game wait for their second press. */
const CONFIRM_MS = 3000;

interface Props {
  view: RoomView;
  receivedAt: number;
  /** A new connection to the room: what it may have lost is sent again. */
  session: number;
  send: (message: ClientMessage) => void;
  onLeave: () => void;
  keyboardEnabled: boolean;
}

/**
 * A round in a room, played as in Anime Music Quiz: a count-in before the
 * first, then the song for everyone at once for the whole time to answer;
 * each player picks an answer and sends it (at once, with Quick answer),
 * then changes it as often as they like, each change sent as it's made,
 * as in Anime Music Quiz; everyone's card shows when their latest answer
 * reached the room. The time is cut to a few seconds once everyone has
 * sent one; then the answer shows where the song played, the song
 * playing again while the next one loads. The
 * screen keeps one layout from the first round to the last, so nothing
 * jumps as the phases change.
 */
export function RoundScreen({
  view,
  receivedAt,
  session,
  send,
  onLeave,
  keyboardEnabled,
}: Props) {
  const { phase, round, settings, current } = view;
  const { game } = settings;
  const isVoice = game === "voice";
  const isPicture = game === "picture";
  const me = view.players.find((p) => p.id === view.you);
  const isHost = view.host === view.you;
  const now = useNow();
  const clock = roomClock(view, receivedAt);
  const { startAt, endAt, maxAt } = clock;
  const started = phase === "playing" && startAt !== null && now >= startAt;
  const answering = phase === "playing";
  const revealed = phase === "reveal";

  const { blobs } = useRoomMedia(view, send, session);
  const url = mediaUrl(current?.file);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const sound = useRoomSound(
    audioRef,
    view,
    clock,
    url ? blobs[url] : undefined,
    now
  );

  // What the player has picked, and what they've sent: the first answer
  // goes when Submit is pressed, or at once with Quick answer on; each
  // change after it goes as it's made, SEND_GAP_MS apart at least.
  const [song, setSong] = React.useState<Song>();
  const [student, setStudent] = React.useState<Student>();
  const [choice, setChoice] = React.useState<string>();
  const [sent, setSent] = React.useState<{ round: number; pick: Pick }>();
  // Cleared as the new round renders, not in an effect after it: the new
  // search box would take the last round's pick as its text first, and
  // keep it once the pick was cleared.
  const [pickRound, setPickRound] = React.useState(round);
  if (pickRound !== round) {
    setPickRound(round);
    setSong(undefined);
    setStudent(undefined);
    setChoice(undefined);
  }
  const selected: string | undefined = current?.choices
    ? choice
    : game === "ost"
    ? song?.themeNo
    : student && String(student.id);
  const mySent = sent?.round === round ? sent.pick : undefined;
  const hasSent = mySent !== undefined;
  const [quick, setQuick] = React.useState(loadQuickAnswer);
  // Picking stops when this page's clock says the time is up; the room
  // decides by its own.
  const open = started && endAt !== null && now < endAt;

  const sentAt = React.useRef(0);
  const sendPick = React.useCallback(
    (pick: Pick) => {
      sentAt.current = Date.now();
      setSent({ round, pick });
      send({ t: "guess", round, pick });
    },
    [round, send]
  );
  /** How long until another answer may go: SEND_GAP_MS after the last. */
  const gapLeft = () => Math.max(0, sentAt.current + SEND_GAP_MS - Date.now());

  const submit = React.useCallback(
    (pick: Pick) => {
      if (!answering || hasSent) return;
      sendPick(pick);
    },
    [answering, hasSent, sendPick]
  );

  // Quick answer: the first pick is sent as it's made, as Submit would.
  React.useEffect(() => {
    if (answering && started && quick && selected !== undefined) {
      submit(selected);
    }
  }, [answering, started, quick, selected, submit]);

  // A change of mind goes as it's made; one within SEND_GAP_MS of the last
  // waits the rest, and the pick showing then goes.
  React.useEffect(() => {
    if (!answering || !open || !hasSent) return;
    if (selected === undefined || selected === mySent) return;
    const wait = Math.max(0, sentAt.current + SEND_GAP_MS - Date.now());
    if (wait === 0) {
      sendPick(selected);
      return;
    }
    const timer = window.setTimeout(() => sendPick(selected), wait);
    return () => window.clearTimeout(timer);
  }, [answering, open, hasSent, selected, mySent, sendPick]);

  // The pick to send as the time runs out: one never sent, or a change
  // still waiting out SEND_GAP_MS.
  const pending = React.useRef<{ round: number; pick?: string }>({ round });
  React.useLayoutEffect(() => {
    pending.current =
      selected !== undefined && selected !== mySent
        ? { round, pick: selected }
        : { round };
  });

  // An answer sent just as the connection dropped may not have reached the
  // room: once back in, it goes again. The room keeps the first of two the
  // same.
  React.useEffect(() => {
    if (answering && mySent !== undefined) {
      send({ t: "guess", round, pick: mySent });
    }
    // Only for a new connection, not each time the view changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // The room has no timers of its own: this page tells it when each of the
  // phase's times has passed (see the README's Multiplayer rooms). Each
  // tick goes once; the room moves on at the first that finds it due.
  const ticked = React.useRef(new Set<string>());
  const readyForNext = (me?.ready ?? -1) >= round + 1;
  React.useEffect(() => {
    const times: Array<[string, number, () => void]> = [];
    const tick = () => send({ t: "tick" });
    const key = `${phase}:${round}`;
    if (phase === "loading" && endAt !== null) {
      times.push([`${key}:end`, endAt + TICK_AFTER_MS, tick]);
    }
    if (phase === "playing" && endAt !== null) {
      times.push([
        `${key}:last`,
        endAt,
        () => {
          const { pick } = pending.current;
          if (pending.current.round !== round || pick === undefined) return;
          // It goes once the gap allows, and the time-up tick after it,
          // so the room can't reveal before it arrives.
          const wait = gapLeft();
          ticked.current.add(`${key}:end`);
          window.setTimeout(() => sendPick(pick), wait);
          window.setTimeout(tick, Math.max(wait, TICK_AFTER_MS));
        },
      ]);
      times.push([`${key}:end`, endAt + TICK_AFTER_MS, tick]);
      times.push([`${key}:late`, endAt + GRACE_MS + 3 * TICK_AFTER_MS, tick]);
    }
    if (phase === "reveal") {
      // At the least time only once this page's next clip is in: until
      // then, its "ready" moves the room on.
      if (endAt !== null && (readyForNext || maxAt === null)) {
        times.push([`${key}:end`, endAt + TICK_AFTER_MS, tick]);
      }
      if (maxAt !== null) {
        times.push([`${key}:max`, maxAt + TICK_AFTER_MS, tick]);
      }
    }
    const timers = times
      .filter(([name]) => !ticked.current.has(name))
      .map(([name, at, act]) =>
        window.setTimeout(() => {
          ticked.current.add(name);
          act();
        }, Math.max(0, at - Date.now()))
      );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [phase, round, endAt, maxAt, readyForNext, send, sendPick]);

  // The clock: to the first count-in's end, then to the time's end; in a
  // reveal, to the next round. Later rounds have no count-in to show: the
  // clock waits, full, for the moment their song starts.
  const countIn = phase === "playing" && !started && round === 0;
  const waitingForSlow =
    revealed &&
    maxAt !== null &&
    view.players.some((p) => p.here && p.ready < round + 1);
  const deadline =
    phase === "playing"
      ? countIn
        ? startAt
        : endAt
      : revealed && waitingForSlow && endAt !== null && now >= endAt
      ? maxAt
      : endAt;
  const span =
    phase === "loading"
      ? LOAD_MS
      : phase === "playing"
      ? countIn
        ? Math.max(1, (startAt ?? 0) - receivedAt)
        : view.settling
        ? SETTLE_MS
        : settings.guessSeconds * 1000
      : REVEAL_MAX_MS;
  const left =
    deadline === null ? 0 : Math.min(span, Math.max(0, deadline - now));
  const low = started && left <= LOW_MS;

  // Leave and End game, pressed once, wait CONFIRM_MS for a second press,
  // so a stray tap doesn't throw the game.
  const [confirming, setConfirming] = React.useState<"leave" | "end" | null>(
    null
  );
  React.useEffect(() => {
    if (!confirming) return;
    const timer = window.setTimeout(() => setConfirming(null), CONFIRM_MS);
    return () => window.clearTimeout(timer);
  }, [confirming]);
  // The host's ask to end the game, while it's open on this page's clock.
  const vote =
    view.vote && receivedAt + view.vote.endsIn > now ? view.vote : undefined;

  // Keys: Enter sends the pick, Space plays a voice line again. The student
  // box sends on its own Enter.
  const [listOpen, setListOpen] = React.useState(false);
  const keys = keyboardEnabled && !listOpen;
  const { replay } = sound;
  const hasChoices = Boolean(current?.choices);
  React.useEffect(() => {
    if (!keys) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === "Enter" && answering && started) {
        if (selected !== undefined && (hasChoices || game === "ost")) {
          e.preventDefault();
          submit(selected);
        }
        return;
      }
      const typing =
        isTextField(e.target) &&
        (e.target as HTMLElement).dataset.typing === "true";
      if (e.code === "Space" && isVoice && sound.canReplay && !typing) {
        e.preventDefault();
        replay();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    keys,
    answering,
    started,
    revealed,
    selected,
    hasChoices,
    isVoice,
    game,
    submit,
    replay,
    sound.canReplay,
  ]);

  const searchRef = React.useRef<HTMLInputElement>(null);
  const canPick = answering && open;
  const result = revealed ? view.results[round] : undefined;
  const last = revealed ? me?.last : undefined;
  const heard = started || revealed;

  // The volume, with a voice line's Play again or a tap to start a song
  // the browser held back: one row at the stage's foot in every phase, so
  // it never moves as a round loads, plays and is revealed. Play again
  // waits, hidden but keeping its place, until the line has played through
  // once: everyone hears it whole first. The volume keeps the middle; these
  // sit to its left.
  const controls = !isPicture && (
    <Styled.StageControls $tap={sound.blocked && heard}>
      <Styled.StageSide>
        {sound.blocked && heard ? (
          <Styled.Small type="button" onClick={sound.resume} $strong>
            <IoVolumeHigh aria-hidden="true" /> Tap to hear
          </Styled.Small>
        ) : (
          isVoice && (
            <Styled.IconButton
              type="button"
              aria-label="Play again"
              title="Play again"
              disabled={!sound.canReplay}
              aria-hidden={!sound.canReplay}
              style={sound.canReplay ? undefined : { visibility: "hidden" }}
              onClick={sound.replay}
            >
              <IoRefresh aria-hidden="true" />
            </Styled.IconButton>
          )
        )}
      </Styled.StageSide>
      <VolumeControl />
    </Styled.StageControls>
  );

  return (
    <>
      {/* The round's song or line; a caption would be the answer. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        preload="auto"
        onPlay={sound.onPlay}
        onPause={sound.onPause}
        onEnded={sound.onEnded}
      />

      <Styled.Status>
        <Styled.RoundNo>
          {isVoice ? "Voice" : isPicture ? "Picture" : "Song"}{" "}
          {Math.max(1, round + 1)}/{view.total}
        </Styled.RoundNo>
        <TA.TimeTrack aria-hidden="true">
          <TA.TimeFill
            $low={low}
            style={{ width: `${Math.min(1, left / span) * 100}%` }}
          />
        </TA.TimeTrack>
        <Styled.Clock
          $low={low}
          role="timer"
          aria-label={`${Math.ceil(left / 1000)} seconds left`}
        >
          {Math.ceil(left / 1000)}
        </Styled.Clock>
      </Styled.Status>

      <Styled.Stage
        aria-label="The round"
        aria-live="polite"
        $right={last ? last.right : null}
      >
        <Styled.StageMain>
          {countIn ? (
            <Styled.Countdown key={Math.ceil(left / 1000)}>
              {Math.max(1, Math.ceil(left / 1000))}
            </Styled.Countdown>
          ) : result ? (
            <Reveal view={view} answer={result.answer} />
          ) : isPicture ? (
            current?.cell !== undefined &&
            started && (
              <PictureCell
                kind={settings.picture}
                cell={current.cell}
                shape={settings.silhouette}
                zoom={settings.picture === "halo" ? 0.85 : 1}
              />
            )
          ) : (
            <>
              <Styled.Bars $on={sound.playing} aria-hidden="true">
                {Array.from({ length: 7 }, (_, i) => (
                  <span key={i} />
                ))}
              </Styled.Bars>
            </>
          )}
          {phase === "loading" && <Styled.StageText>Loading…</Styled.StageText>}
        </Styled.StageMain>
        {controls}
      </Styled.Stage>

      <Styled.Answers
        $choices={Boolean(current?.choices) || settings.answers === "choice"}
      >
        {current?.choices && heard ? (
          isVoice || isPicture ? (
            <VoiceChoices
              choices={current.choices.map(Number)}
              onPick={canPick ? (id) => setChoice(String(id)) : undefined}
              selected={choice === undefined ? undefined : Number(choice)}
              answer={result ? Number(result.answer) : undefined}
              picked={
                last?.pick == null || !result ? undefined : Number(last.pick)
              }
              keyboardEnabled={keys && answering}
            />
          ) : (
            <Choices
              choices={current.choices}
              onPick={canPick ? (s) => setChoice(s.themeNo) : undefined}
              selected={choice}
              answer={result?.answer}
              picked={result ? last?.pick ?? undefined : undefined}
              keyboardEnabled={keys && answering}
            />
          )
        ) : settings.answers === "choice" ? (
          // The four's places, empty until the song starts, so the
          // column doesn't jump as they come.
          <ChoiceStyled.Grid
            role="group"
            aria-label="The four answers show as it starts"
          >
            {[1, 2, 3, 4].map((key) => (
              <ChoiceStyled.Choice
                key={key}
                type="button"
                $tone="open"
                disabled
              >
                <ChoiceStyled.Key aria-hidden="true">{key}</ChoiceStyled.Key>
                {game !== "ost" && <Styled.ChoiceWaitIcon aria-hidden="true" />}
                <Styled.ChoiceWait aria-hidden="true">
                  <span />
                  <span />
                </Styled.ChoiceWait>
              </ChoiceStyled.Choice>
            ))}
          </ChoiceStyled.Grid>
        ) : answering ? (
          game === "ost" ? (
            <Search
              currentTry={round}
              setSelectedSong={setSong}
              selectedSong={song}
              inputRef={searchRef}
              keyboardEnabled={keys}
            />
          ) : (
            <Styled.SearchRow>
              <StudentSearch
                key={round}
                pool={
                  isVoice
                    ? voicePool(settings.server)
                    : picturePool(settings.picture, settings.server)
                }
                guessed={NONE}
                onGuess={(id) => started && submit(String(id))}
                selected={student}
                onSelect={setStudent}
                direction="up"
                keyboardEnabled={keys}
              />
              <BrowseButton
                type="button"
                onClick={() => setListOpen(true)}
                aria-label="Browse all students"
                title="All students"
              >
                <IoGrid size={20} aria-hidden="true" />
              </BrowseButton>
            </Styled.SearchRow>
          )
        ) : (
          <Styled.Sent $right={last ? last.right : null}>
            {last?.pick == null
              ? "No answer"
              : `${last.right ? "✓" : "✗"} ${pickName(settings, last.pick)}`}
          </Styled.Sent>
        )}

        <Styled.SubmitRow $hidden={!answering}>
          <Button
            stroke
            variant="green"
            onClick={() => selected !== undefined && submit(selected)}
            disabled={!started || selected === undefined || hasSent}
          >
            {hasSent ? "Sent ✓" : "Submit"}
          </Button>
          <Styled.Small
            type="button"
            $strong={quick}
            aria-pressed={quick}
            aria-label="Quick answer"
            title="Quick answer: your first pick goes as soon as it's made, without Submit"
            onClick={() => {
              setQuick(!quick);
              saveQuickAnswer(!quick);
            }}
          >
            ⚡ Quick {quick ? "on" : "off"}
          </Styled.Small>
        </Styled.SubmitRow>
      </Styled.Answers>

      <PlayerList view={view} />

      {/* Small, apart, and each needs a second press: not to hit by mistake. */}
      <Styled.QuitRow>
        <Styled.Quiet
          type="button"
          $armed={confirming === "leave"}
          onClick={() => {
            if (confirming === "leave") onLeave();
            else setConfirming("leave");
          }}
        >
          {confirming === "leave" ? "Tap again to leave" : "Leave"}
        </Styled.Quiet>
        {vote ? (
          <Styled.Vote role="group" aria-label="End the game early?">
            <span>
              End the game? {vote.yes}/{vote.needed}
            </span>
            {vote.mine === null ? (
              <>
                <Styled.Quiet
                  type="button"
                  $armed={false}
                  onClick={() => send({ t: "vote", yes: true })}
                >
                  Yes
                </Styled.Quiet>
                <Styled.Quiet
                  type="button"
                  $armed={false}
                  onClick={() => send({ t: "vote", yes: false })}
                >
                  No
                </Styled.Quiet>
              </>
            ) : (
              <span>{vote.mine ? "✓" : "✗"}</span>
            )}
          </Styled.Vote>
        ) : (
          isHost && (
            <Styled.Quiet
              type="button"
              $armed={confirming === "end"}
              onClick={() => {
                if (confirming === "end") {
                  setConfirming(null);
                  send({ t: "end" });
                } else setConfirming("end");
              }}
            >
              {confirming === "end" ? "Ask everyone to end it?" : "End game"}
            </Styled.Quiet>
          )
        )}
      </Styled.QuitRow>

      {listOpen && (
        <StudentListPopUp
          pool={
            isVoice
              ? voicePool(settings.server)
              : picturePool(settings.picture, settings.server)
          }
          guessed={NONE}
          onPick={(id) => {
            setListOpen(false);
            setStudent(studentById.get(id));
          }}
          onClose={() => setListOpen(false)}
        />
      )}
    </>
  );
}

const NONE = new Set<number>();

/**
 * The answer, where the song played or the picture showed: the song's
 * album cover, name and artist, or the student with their school, as the
 * song plays on.
 */
function Reveal({ view, answer }: { view: RoomView; answer: string }) {
  const { settings } = view;
  const label = <Styled.AnswerLabel>It was</Styled.AnswerLabel>;
  if (settings.game === "ost") {
    const song = songByTheme.get(answer);
    return (
      <Styled.Reveal>
        <Styled.RevealArt>
          <AlbumArt song={song} />
        </Styled.RevealArt>
        <Styled.RevealText>
          {label}
          <Styled.AnswerName>{song?.name ?? "?"}</Styled.AnswerName>
          <Styled.AnswerMeta>
            {song?.artist}
            <ThemeTag themeNo={answer} />
          </Styled.AnswerMeta>
        </Styled.RevealText>
      </Styled.Reveal>
    );
  }
  const student = studentById.get(Number(answer));
  const picture =
    settings.game === "picture"
      ? answerOf(settings.picture, Number(answer), settings.server)
      : undefined;
  return (
    <Styled.Reveal>
      {picture ? (
        <Styled.RevealPicture $kind={settings.picture}>
          <PictureCell
            kind={settings.picture}
            cell={picture.picture}
            zoom={settings.picture === "halo" ? 0.72 : 0.6}
          />
        </Styled.RevealPicture>
      ) : (
        <Styled.RevealArt $round>
          <StudentIcon id={Number(answer)} size={76} />
        </Styled.RevealArt>
      )}
      <Styled.RevealText>
        {label}
        <Styled.AnswerName>{student?.name ?? "?"}</Styled.AnswerName>
        <Styled.AnswerMeta>
          {student?.school}
          {student?.club ? ` · ${student.club}` : ""}
        </Styled.AnswerMeta>
      </Styled.RevealText>
    </Styled.Reveal>
  );
}
