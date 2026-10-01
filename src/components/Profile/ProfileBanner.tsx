import React from "react";

import { Banner } from "../../constants/cosmetics";
import { iconNamed } from "../../constants/icons";
import { backupUrlFor } from "../../helpers/audioUrl";
import { pictureUrl } from "../../helpers/season";

import * as Styled from "./index.styled";

/**
 * The player's title on its banner: a pill with a picture under a tint or
 * a foil of colours, the emblem in a ring at its head and slanted stripes
 * at its tail.
 */
export function ProfileBanner({
  banner,
  title,
  size = "small",
}: {
  banner: Banner;
  title: string;
  size?: "small" | "large";
}) {
  const Emblem = iconNamed(banner.emblem);
  return (
    <Styled.Banner
      $size={size}
      $fill={banner.picture ? undefined : banner.fill}
      $accent={banner.accent}
    >
      {banner.picture && (
        <WorkerPicture key={banner.picture} picture={banner.picture} />
      )}
      {banner.picture && banner.tint && (
        <Styled.BannerTint $tint={banner.tint} aria-hidden="true" />
      )}
      <Styled.BannerStripes $accent={banner.accent} aria-hidden="true" />
      <Styled.Emblem $accent={banner.accent} $ink={banner.ink}>
        <Emblem aria-hidden="true" />
      </Styled.Emblem>
      <Styled.BannerTitle $ink={banner.ink}>{title}</Styled.BannerTitle>
    </Styled.Banner>
  );
}

/**
 * A picture on the Worker, or its copy on R2; gone if both fail. Keyed by
 * its picture where it can change, so a new one starts on the Worker.
 */
export function WorkerPicture({
  picture,
  as: Component = Styled.Cover,
}: {
  picture: string;
  as?: typeof Styled.Cover;
}) {
  const [src, setSrc] = React.useState<string | null>(() =>
    pictureUrl(picture)
  );
  if (!src) return null;
  return (
    <Component
      src={src}
      alt=""
      loading="lazy"
      onError={() => {
        const backup = backupUrlFor(src);
        setSrc(backup && backup !== src ? backup : null);
      }}
    />
  );
}
