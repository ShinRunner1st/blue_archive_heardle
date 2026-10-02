/**
 * The preview frame's pictures, seasons and badges, drawn by the game's own
 * parts where it has them: a picture as a profile's background and banner,
 * a season behind the page, the albums on the profile's badge shelf.
 */
import styled from "styled-components";

import { PopUp } from "../components/PopUp";
import ProfilePopUp from "../components/Profile";
import { CardLook, PlayerCard } from "../components/Profile/PlayerCard";
import { ProfileHero } from "../components/Profile/ProfileCard";
import { BACKGROUNDS, BANNERS, FRAMES } from "../constants/cosmetics";
import { pictureUrl } from "../helpers/season";
import type { PreviewView } from "./messages";

const nothing = () => {};

const Page = styled.div<{ $src: string }>`
  position: fixed;
  inset: 0;
  background: ${({ theme }) => theme.background1} center / cover no-repeat;
  background-image: ${({ $src }) => ($src ? `url("${$src}")` : "none")};
`;

const Panel = styled.div`
  position: fixed;
  left: 24px;
  bottom: 24px;
  max-width: min(420px, calc(100% - 48px));
  padding: 14px 18px;
  border-radius: 12px;
  color: ${({ theme }) => theme.text};
  background: ${({ theme }) => theme.background100};
  border: 2px solid ${({ theme }) => theme.border};
  font-family: "Nunito Sans Variable";

  h2 {
    margin: 0 0 6px;
    font-size: 1.1rem;
  }

  p {
    margin: 4px 0 0;
  }
`;

const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
const when = ([month, day]: number[]) => `${day} ${MONTHS[month - 1] ?? "?"}`;

type View<K> = Extract<PreviewView, { kind: K }>;

export function PicturePreview({ view }: { view: View<"picture"> }) {
  if (!view.key) {
    return (
      <Panel>
        <p>Pick a picture that&apos;s listed to see it on a profile.</p>
      </Panel>
    );
  }
  const look: CardLook = {
    name: "Sensei",
    student: 10000,
    title: "",
    banner: {
      ...BANNERS[1],
      picture: view.key,
      tint: BANNERS[1].tint ?? "#1B2A4A",
    },
    frame: FRAMES[0],
    background: { ...BACKGROUNDS[0], picture: view.key },
  };
  return (
    <>
      <Page $src={pictureUrl(view.key)} />
      <PopUp
        wide
        bleed
        fixed
        title="Profile"
        onClose={nothing}
        head={<ProfileHero look={look} actions={null} />}
      >
        <div style={{ padding: "18px 28px", maxWidth: 420 }}>
          <p>As a background and on a banner (with the Cherry blossom tint):</p>
          <PlayerCard look={look} />
        </div>
      </PopUp>
    </>
  );
}

export function SeasonPreview({
  view,
  night,
}: {
  view: View<"season">;
  night: boolean;
}) {
  const src = night ? view.night : view.day;
  return (
    <>
      <Page $src={src} />
      <Panel>
        <h2>
          {view.id} · {when(view.from)} – {when(view.to)}
        </h2>
        {!src && <p>No {night ? "night" : "day"} picture yet.</p>}
        <p>
          The home background on these days, {night ? "by night" : "by day"}.
          After a lost streak: “Back to {view.home || "…"}”.
        </p>
      </Panel>
    </>
  );
}

export function BadgesPreview({ view }: { view: View<"badges"> }) {
  const badges = view.badges.map((badge) => {
    const songs = badge.songs ? badge.songs.split(" ") : [];
    const found =
      badge.number === view.selected ? Math.min(view.found, songs.length) : 0;
    return {
      volume: {
        number: badge.number,
        title: badge.title,
        cover: view.covers[badge.cover],
        songs,
      },
      found,
      total: songs.length,
      done: songs.length > 0 && found === songs.length,
    };
  });
  // The game's own profile, on its OST tab, with the albums being made:
  // its other tabs (Overview has the shelf too) are a click away.
  return (
    <ProfilePopUp
      onClose={nothing}
      onSenseiCard={nothing}
      startTab="ost"
      badges={badges}
    />
  );
}
