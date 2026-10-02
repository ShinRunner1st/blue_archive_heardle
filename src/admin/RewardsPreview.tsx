/**
 * The rewards in the preview frame, each where players meet it: titles and
 * colours on the Sensei card, banners, frames, backgrounds and name effects
 * in Customize
 * and on the cards rooms show, cursor colours and characters in Settings.
 * All drawn by the game's own components from the draft.
 */
import React from "react";
import styled, { useTheme } from "styled-components";

import { CosmeticChoices } from "../components/CosmeticChoices";
import { PopUp, PopUpBody, PopUpGroupLabel } from "../components/PopUp";
import { CosmeticOptions } from "../components/Profile/Customize";
import { CardLook, PlayerCard } from "../components/Profile/PlayerCard";
import { ProfileHero } from "../components/Profile/ProfileCard";
import { ProfileFrame } from "../components/Profile/ProfileFrame";
import * as ProfileStyled from "../components/Profile/index.styled";
import { songs } from "../constants";
import { titleText } from "../constants/cosmetics";
import type {
  Banner,
  CardColors,
  Cosmetic,
  CursorColor,
  Frame,
  NameEffect,
  ProfileBackground,
} from "../constants/cosmetics";
import { students } from "../constants/students";
import { VOLUMES } from "../constants/volumes";
import { showCursorColor } from "../helpers/cosmetics";
import { applyCustomCursorToDocument } from "../helpers/customCursor";
import { makeSenseiCard } from "../helpers/picture/senseiCard";
import { studentById } from "../helpers/studentRounds";
import logo from "../image/BlueArchive-Heardle.png";
import type { PreviewView } from "./messages";
import { RoomPreview, SHOWN_IN_ROOMS } from "./RoomPreview";

type RewardsView = Extract<PreviewView, { kind: "rewards" }>;

/** The student on the sample cards: the first with a portrait. */
const SAMPLE_STUDENT = 10000;

const nothing = () => {};

const Row = styled.div`
  display: flex;
  gap: 10px;
  align-items: flex-start;
`;

const Narrow = styled.div<{ $width: number }>`
  width: ${({ $width }) => $width}px;
  max-width: 100%;
`;

const CardPicture = styled.img`
  display: block;
  width: 100%;
  height: auto;
  border-radius: 12px;
`;

export function RewardsPreview({
  view,
  night,
}: {
  view: RewardsView;
  night: boolean;
}) {
  const { cosmetics, list, index, unlocked, missions } = view;
  if (view.screen && view.screen !== "own" && SHOWN_IN_ROOMS.has(list)) {
    return <RoomPreview view={view} screen={view.screen} night={night} />;
  }
  const titleOf = (id: string | undefined) =>
    missions.find((mission) => mission.id === id)?.title ?? "";
  // Everything cleared, or nothing: a player with all of it, or a new one.
  const cleared = unlocked ? missions.map(({ id }) => id) : [];
  const item = (cosmetics[list][index] ?? cosmetics[list][0]) as Cosmetic;
  const pickOf = <T,>(name: typeof list, items: T[]) =>
    (name === list ? item : items[0]) as T;

  const title = pickOf("titles", cosmetics.titles);
  const look: CardLook = {
    name: "Sensei",
    student: SAMPLE_STUDENT,
    title: titleText(title),
    banner: pickOf<Banner>("banners", cosmetics.banners),
    frame: pickOf<Frame>("frames", cosmetics.frames),
    background: pickOf<ProfileBackground>("backgrounds", cosmetics.backgrounds),
    nameEffect: pickOf<NameEffect>("nameEffects", cosmetics.nameEffects),
  };

  switch (list) {
    case "titles":
    case "cardColors":
      return (
        <PopUp title="Sensei card 🪪" onClose={nothing}>
          <PopUpBody>
            <PopUpGroupLabel id="titles">Title</PopUpGroupLabel>
            <CosmeticChoices
              labelledBy="titles"
              choices={cosmetics.titles}
              selected={title.id}
              onPick={nothing}
              cleared={cleared}
              titleOf={titleOf}
            />
            <PopUpGroupLabel id="colours">Colours</PopUpGroupLabel>
            <CosmeticChoices
              labelledBy="colours"
              choices={cosmetics.cardColors.map((choice) => ({
                ...choice,
                swatch: `linear-gradient(135deg, ${choice.band[0]}, ${choice.band[1]})`,
              }))}
              selected={
                pickOf<CardColors>("cardColors", cosmetics.cardColors).id
              }
              onPick={nothing}
              cleared={cleared}
              titleOf={titleOf}
            />
            <SenseiCardPicture
              title={titleText(title) || undefined}
              colors={pickOf<CardColors>("cardColors", cosmetics.cardColors)}
            />
            {list === "titles" && (
              <>
                <PopUpGroupLabel>On the profile&apos;s banner</PopUpGroupLabel>
                <PlayerCard look={look} />
              </>
            )}
          </PopUpBody>
        </PopUp>
      );

    case "cursorColors":
      return (
        <PopUp title="Settings" onClose={nothing}>
          <PopUpBody>
            <PopUpGroupLabel id="cursor">Cursor colour</PopUpGroupLabel>
            <CosmeticChoices
              labelledBy="cursor"
              choices={cosmetics.cursorColors}
              selected={item.id}
              onPick={nothing}
              cleared={cleared}
              titleOf={titleOf}
            />
            <p>Tap or drag anywhere to try it. It taps by itself too.</p>
          </PopUpBody>
          <CursorDemo color={item as CursorColor} />
        </PopUp>
      );

    case "characters":
      return (
        <PopUp title="Settings" onClose={nothing}>
          <PopUpBody>
            <PopUpGroupLabel id="character">Character</PopUpGroupLabel>
            <CosmeticChoices
              labelledBy="character"
              choices={cosmetics.characters}
              selected={item.id}
              onPick={nothing}
              cleared={cleared}
              titleOf={titleOf}
            />
          </PopUpBody>
        </PopUp>
      );

    default: {
      const kind =
        list === "banners"
          ? "banner"
          : list === "frames"
          ? "frame"
          : list === "nameEffects"
          ? "nameEffect"
          : "background";
      return (
        // As the profile shows them: its head with the background and the
        // banner, its frame round the panel, and Customize's card and
        // choices inside, with the cards rooms show.
        <PopUp
          wide
          bleed
          fixed
          title="Profile"
          onClose={nothing}
          head={<ProfileHero look={look} actions={null} />}
          frame={(panel) => (
            <ProfileFrame frame={look.frame} popUp>
              {panel}
            </ProfileFrame>
          )}
        >
          <ProfileStyled.CustomizeBody style={{ paddingTop: 18 }}>
            <ProfileStyled.Preview>
              <ProfileStyled.PreviewLabel>Your card</ProfileStyled.PreviewLabel>
              <PlayerCard look={look} />
              <ProfileStyled.PreviewLabel>
                In a room: the standings, a round
              </ProfileStyled.PreviewLabel>
              <Row>
                <Narrow $width={150}>
                  <PlayerCard look={look} variant="tall" banner />
                </Narrow>
                <Narrow $width={170}>
                  <PlayerCard look={look} variant="mini" />
                </Narrow>
              </Row>
            </ProfileStyled.Preview>
            <ProfileStyled.Choices>
              <ProfileStyled.Section>
                <ProfileStyled.SectionHead>
                  <ProfileStyled.SubHeading id="options">
                    {kind === "banner"
                      ? "Banner"
                      : kind === "frame"
                      ? "Frame"
                      : kind === "nameEffect"
                      ? "Name effect"
                      : "Background"}
                  </ProfileStyled.SubHeading>
                </ProfileStyled.SectionHead>
                <CosmeticOptions
                  kind={kind}
                  items={cosmetics[list] as Cosmetic[]}
                  cleared={cleared}
                  picked={item.id}
                  labelledBy="options"
                  onPick={nothing}
                  titleOf={titleOf}
                />
              </ProfileStyled.Section>
            </ProfileStyled.Choices>
          </ProfileStyled.CustomizeBody>
        </PopUp>
      );
    }
  }
}

/** A Sensei card as the game draws it, with a made-up record on it. */
function SenseiCardPicture({
  title,
  colors,
}: {
  title: string | undefined;
  colors: CardColors;
}) {
  const theme = useTheme();
  const [url, setUrl] = React.useState<string>();

  React.useEffect(() => {
    let live = true;
    let made: string | undefined;
    makeSenseiCard(
      {
        stats: {
          songsGuessed: 128,
          songsTotal: songs.length,
          badgesEarned: 3,
          badgesTotal: VOLUMES.length,
          badges: [],
          bestDailyStreak: 21,
          bestWinStreak: 34,
          timeAttackBest: 27,
          studentsFound: 140,
          studentsTotal: students.length,
          roundsPlayed: 512,
          since: new Date(2026, 8, 27),
          missionsCleared: 12,
          missionsTotal: 39,
        },
        name: "Sensei",
        favourite: studentById.get(SAMPLE_STUDENT) ?? null,
        issued: new Date(),
        title,
        frame: colors,
      },
      { backdrop: theme.backgroundImage, logo }
    ).then((blob) => {
      if (!live) return;
      made = URL.createObjectURL(blob);
      setUrl(made);
    });
    return () => {
      live = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [title, colors, theme.backgroundImage]);

  return url ? (
    <CardPicture src={url} alt="The Sensei card" width={1200} height={756} />
  ) : (
    <p>Drawing…</p>
  );
}

/**
 * The cursor's effects in the colour being made, with a tap and a drag now
 * and then by themselves, so the preview shows them without a hand on it.
 */
function CursorDemo({ color }: { color: CursorColor }) {
  showCursorColor(color);

  React.useEffect(() => {
    applyCustomCursorToDocument(true);
    let step = 0;
    const send = (type: string, x: number, y: number) =>
      window.dispatchEvent(
        new PointerEvent(type, { clientX: x, clientY: y, pointerId: 77 })
      );
    const timer = window.setInterval(() => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      step++;
      if (step % 2) {
        const x = w * (0.3 + 0.4 * Math.random());
        const y = h * (0.6 + 0.25 * Math.random());
        send("pointerdown", x, y);
        send("pointerup", x, y);
        return;
      }
      // A short drag across the foot of the window.
      const y = h * 0.82;
      send("pointerdown", w * 0.2, y);
      for (let i = 1; i <= 24; i++) {
        window.setTimeout(
          () =>
            send(
              "pointermove",
              w * (0.2 + i * 0.025),
              y - Math.sin(i / 4) * 40
            ),
          i * 16
        );
      }
      window.setTimeout(() => send("pointerup", w * 0.8, y), 25 * 16);
    }, 900);
    return () => {
      window.clearInterval(timer);
      applyCustomCursorToDocument(false);
    };
  }, []);

  return null;
}
