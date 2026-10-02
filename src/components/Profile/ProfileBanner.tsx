import React from "react";

import { Banner, BannerEmblem } from "../../constants/cosmetics";
import { iconNamed } from "../../constants/icons";
import { backupUrlFor } from "../../helpers/audioUrl";
import { pictureUrl } from "../../helpers/season";

import * as Styled from "./index.styled";
import { OrnamentShapeView } from "./ProfileFrame";

/**
 * The player's title on its nameplate, as the game shows its emblems (user
 * titles): a plate of a picture or a foil, the game's facets, grid or lines
 * over it, a light rim, the title on a soft band, an emblem in a ring, as a
 * crest or down the side, and a tag at its foot. All from its entry.
 */
export function ProfileBanner({
  banner,
  title,
  size = "small",
}: {
  banner: Banner;
  title: string;
  size?: Styled.PlateSize;
}) {
  // No banner: the title alone, as a line of words, or nothing.
  if (banner.blank) {
    return title ? (
      <Styled.PlainTitle $size={size}>{title}</Styled.PlainTitle>
    ) : null;
  }
  const { emblem } = banner;
  return (
    <Styled.Banner
      $size={size}
      $fill={banner.picture ? undefined : banner.fill}
      $accent={banner.accent}
    >
      {banner.picture && (
        <WorkerPicture key={banner.picture} picture={banner.picture} />
      )}
      {banner.pattern && (
        <BannerPattern pattern={banner.pattern} accent={banner.accent} />
      )}
      {emblem?.style === "side" && emblem.picture && (
        <Styled.SideEmblem
          $accent={banner.accent}
          $cut={!!emblem.cut}
          aria-hidden="true"
        >
          <WorkerPicture key={emblem.picture} picture={emblem.picture} />
        </Styled.SideEmblem>
      )}
      {emblem && emblem.style !== "side" && (
        <Styled.Emblem
          $style={emblem.style}
          $accent={banner.accent}
          $ink={banner.ink}
          aria-hidden="true"
        >
          <EmblemArt emblem={emblem} />
        </Styled.Emblem>
      )}
      <Styled.BannerText
        $side={emblem?.style !== "side" ? null : emblem.cut ? "cut" : "drawn"}
        $tag={!!banner.tag && size !== "tiny"}
      >
        {banner.band && (
          <Styled.BannerBand
            $band={banner.band}
            $tag={!!banner.tag && size !== "tiny"}
          />
        )}
        <Styled.BannerTitle $ink={banner.ink}>{title}</Styled.BannerTitle>
      </Styled.BannerText>
      {/* Too small to read on a podium's plate. */}
      {banner.tag && size !== "tiny" && (
        <Styled.BannerTag $ink={banner.ink}>{banner.tag}</Styled.BannerTag>
      )}
    </Styled.Banner>
  );
}

/** An emblem's icon, or its shapes in their 24×24 box. */
export function EmblemArt({ emblem }: { emblem: BannerEmblem }) {
  if (emblem.shapes) {
    return (
      <svg viewBox="0 0 24 24">
        {emblem.shapes.map((shape, i) => (
          <OrnamentShapeView
            key={i}
            shape={shape}
            colors={emblem.colors ?? []}
          />
        ))}
      </svg>
    );
  }
  const Icon = iconNamed(emblem.icon ?? "");
  return <Icon />;
}

/**
 * Facets as the game's plates have them: pale triangles hanging from the
 * top and rising from the foot, with a sheen across the left, in the
 * plate's 558×106 (the game's own size).
 */
const FACETS: Array<[string, number]> = [
  ["40,0 120,0 40,106 -40,106", 0.12],
  ["170,0 262,0 216,64", 0.22],
  ["236,0 344,0 290,88", 0.14],
  ["300,106 366,106 333,58", 0.16],
  ["392,106 470,106 431,36", 0.2],
  ["428,0 530,0 479,74", 0.16],
  ["500,106 558,106 558,24", 0.14],
  ["0,106 92,106 46,52", 0.1],
];

/** The pattern over a plate, in its accent. */
function BannerPattern({
  pattern,
  accent,
}: {
  pattern: Banner["pattern"];
  accent: string;
}) {
  if (pattern === "facets") {
    return (
      <Styled.BannerFacets
        viewBox="0 0 558 106"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {FACETS.map(([points, strength]) => (
          <polygon
            key={points}
            points={points}
            fill={accent}
            opacity={strength}
          />
        ))}
      </Styled.BannerFacets>
    );
  }
  return <Styled.BannerLines $grid={pattern === "grid"} $accent={accent} />;
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
