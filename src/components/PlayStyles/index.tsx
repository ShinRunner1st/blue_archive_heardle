import React from "react";
import {
  IoHome,
  IoMic,
  IoMusicalNotes,
  IoPeople,
  IoSparkles,
} from "react-icons/io5";

import { Page, PAGES } from "../../constants/pages";
import { isPlainClick } from "../../hooks/usePage";
import { GameMode } from "../../types/mode";
import { PicturePill, PictureStyle, pillOf } from "../../types/picture";
import { StudentGame } from "../../types/student";
import { VoiceStyle } from "../../types/voice";

import * as Styled from "./index.styled";

interface Option<T extends string> {
  value: T;
  label: string;
  /** In place of the label on a narrow phone, where it wouldn't fit. */
  short?: string;
  hint: string;
  /** Shown beside the label, and in its place on a narrow phone. */
  icon?: React.ReactNode;
  /**
   * Makes the option a link to one of the site's pages, which search engines
   * follow and a middle click opens in a new tab. A plain click still calls
   * onChange, which moves there without a reload.
   */
  href?: string;
}

interface PillsProps<T extends string> {
  /** What the choice is, for screen readers. */
  label: string;
  options: Array<Option<T>>;
  value: T;
  onChange: (value: T) => void;
  /**
   * Only the picked option's label shows, beside its icon; the rest are
   * icons. Each pill is as wide as it needs, so the sliding pill follows the
   * picked one's size.
   */
  compact?: boolean;
}

/**
 * Where the picked option is, for a compact switch's sliding pill, measured
 * after each change and whenever the switch changes size.
 */
function usePickedBox(
  group: React.RefObject<HTMLDivElement | null>,
  index: number,
  enabled: boolean
): { left: number; width: number } | null {
  const [box, setBox] = React.useState<{ left: number; width: number } | null>(
    null
  );

  React.useLayoutEffect(() => {
    const element = group.current;
    if (!enabled || !element) return;

    const measure = () => {
      const picked =
        element.querySelectorAll<HTMLElement>("[data-pill]")[index];
      if (!picked) return;
      setBox({ left: picked.offsetLeft, width: picked.offsetWidth });
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    // Each pill too: one can change size, as the font loads, without the
    // switch doing so.
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    element.querySelectorAll("[data-pill]").forEach((b) => observer.observe(b));
    return () => observer.disconnect();
  }, [group, index, enabled]);

  return box;
}

/**
 * A smaller cousin of the header's Daily/Endless switch, for the choices under
 * the header: which game, and how to play it.
 */
export function Pills<T extends string>({
  label,
  options,
  value,
  onChange,
  compact = false,
}: PillsProps<T>) {
  const index = Math.max(
    options.findIndex((option) => option.value === value),
    0
  );
  const group = React.useRef<HTMLDivElement>(null);
  const box = usePickedBox(group, index, compact);

  return (
    <Styled.Styles
      ref={group}
      as={options.some((option) => option.href) ? "nav" : "div"}
      role={options.some((option) => option.href) ? undefined : "group"}
      aria-label={label}
      $count={options.length}
      $compact={compact}
    >
      <Styled.Thumb
        aria-hidden="true"
        $index={index}
        $count={options.length}
        style={
          compact && box
            ? { left: box.left, width: box.width, transform: "none" }
            : undefined
        }
      />
      {options.map((option) => {
        const active = option.value === value;
        const shared = {
          $active: active,
          $iconOnly: Boolean(option.icon),
          title: option.hint,
          "aria-label": option.icon ? option.label : undefined,
          "data-pill": "",
        };
        const content = (
          <>
            {option.icon}
            <Styled.Label
              $hideable={Boolean(option.icon)}
              $hidden={compact && !active}
              data-short={option.short}
            >
              {compact ? (
                // As wide as the longest name, so the switch keeps one width
                // whichever game is picked. The others' names are drawn by
                // CSS, invisibly, so the button's text is its own name.
                <Styled.Fit>
                  <span>{option.label}</span>
                  {options.map((other) => (
                    <Styled.Ghost key={other.value} data-label={other.label} />
                  ))}
                </Styled.Fit>
              ) : (
                option.label
              )}
            </Styled.Label>
          </>
        );
        return option.href ? (
          <Styled.Style
            key={option.value}
            as="a"
            href={option.href}
            aria-current={active ? "page" : undefined}
            onClick={(event: React.MouseEvent) => {
              if (!isPlainClick(event)) return;
              event.preventDefault();
              onChange(option.value);
            }}
            {...shared}
          >
            {content}
          </Styled.Style>
        ) : (
          <Styled.Style
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            {...shared}
          >
            {content}
          </Styled.Style>
        );
      })}
    </Styled.Styles>
  );
}

/** The ways to play under Endless, in the order the switch shows them. */
export const PLAY_STYLES: Array<Option<GameMode>> = [
  { value: "endless", label: "Classic", hint: "Six tries to name each song" },
  {
    value: "choice",
    label: "4-Choice",
    hint: "A short clip and one pick from four answers",
  },
  {
    value: "timeattack",
    label: "Time Attack",
    short: "Timed",
    hint: "As many songs as you can in three minutes",
  },
];

/**
 * Picks how to play Endless, above the play area. It shows only there: the
 * header keeps the one choice every player makes, Daily or Endless, and fits
 * on a phone beside the logo.
 */
export function PlayStyles({
  mode,
  onChange,
}: {
  mode: GameMode;
  onChange: (mode: GameMode) => void;
}) {
  return (
    <Pills
      label="Way to play"
      options={PLAY_STYLES}
      value={mode}
      onChange={onChange}
    />
  );
}

export const PAGE_LINKS: Array<Option<Page>> = (
  [
    {
      value: "hub",
      label: "Home",
      hint: "Every game, and today's puzzles",
      icon: <IoHome aria-hidden="true" />,
    },
    {
      value: "ost",
      label: "OST",
      hint: "Name the song from a clip",
      icon: <IoMusicalNotes aria-hidden="true" />,
    },
    {
      value: "voice",
      label: "Voice",
      hint: "Name the student from their voice",
      icon: <IoMic aria-hidden="true" />,
    },
    {
      value: "picture",
      label: "Picture",
      hint: "Name the student from their halo or weapon",
      icon: <IoSparkles aria-hidden="true" />,
    },
    {
      value: "students",
      label: "Students",
      hint: "Name the student from how they compare",
      icon: <IoPeople aria-hidden="true" />,
    },
  ] satisfies Array<Option<Page>>
).map((option) => ({ ...option, href: PAGES[option.value].path }));

/**
 * The site's navigation bar: the hub, then the games in PAGE_ORDER's order,
 * the OST, the students' voices, their halos and weapons, and the students
 * by clues. Each is a link to its own page.
 */
export function GameSwitch({
  page,
  onChange,
}: {
  page: Page;
  onChange: (page: Page) => void;
}) {
  return (
    <Pills
      label="Games"
      options={PAGE_LINKS}
      value={page}
      onChange={onChange}
      compact
    />
  );
}

const STUDENT_GAMES: Array<Option<StudentGame>> = [
  {
    value: "gameplay",
    label: "Gameplay",
    hint: "School, role, damage, defense, weapon, EX cost and release",
  },
  {
    value: "lore",
    label: "Lore",
    hint: "Height, birthday, year, club, favourite gift and more",
  },
];

/** Picks how to play the student game: by kit, or by profile. */
export function StudentStyles({
  game,
  onChange,
}: {
  game: StudentGame;
  onChange: (game: StudentGame) => void;
}) {
  return (
    <Pills
      label="Way to play"
      options={STUDENT_GAMES}
      value={game}
      onChange={onChange}
    />
  );
}

const VOICE_STYLES: Array<Option<Exclude<VoiceStyle, "nohint">>> = [
  {
    value: "endless",
    label: "Classic",
    hint: "Four tries, with a hint after each miss, or none",
  },
  {
    value: "choice",
    label: "4-Choice",
    hint: "One pick from four students",
  },
  {
    value: "timeattack",
    label: "Time Attack",
    short: "Timed",
    hint: "As many voices as you can in three minutes",
  },
];

/**
 * Picks how to play Voice mode's Endless: the OST's three, so the row is the
 * same as its. No hints is Classic with its hints turned off, picked above
 * the game (see VoiceGame), as 4-Choice's clip length is: a fourth pill
 * didn't fit beside the game switch.
 */
export function VoiceStyles({
  style,
  onChange,
}: {
  style: VoiceStyle;
  onChange: (style: Exclude<VoiceStyle, "nohint">) => void;
}) {
  return (
    <Pills
      label="Way to play"
      options={VOICE_STYLES}
      value={style === "nohint" ? "endless" : style}
      onChange={onChange}
    />
  );
}

const PICTURE_STYLES: Array<Option<PicturePill>> = [
  {
    value: "endless",
    label: "Classic",
    hint: "Four tries, with a hint after each miss or none, the picture or its silhouette",
  },
  {
    value: "choice",
    label: "4-Choice",
    hint: "One pick from four students, the picture or its silhouette",
  },
  {
    value: "timeattack",
    label: "Time Attack",
    short: "Timed",
    hint: "As many as you can in three minutes",
  },
];

/**
 * Picks how to play the picture game's Endless: the OST's three, as Voice
 * mode's. The silhouette and hints are picked above the game (see
 * PictureGame), as Voice's hints are.
 */
export function PictureStyles({
  style,
  onChange,
}: {
  style: PictureStyle;
  onChange: (pill: PicturePill) => void;
}) {
  return (
    <Pills
      label="Way to play"
      options={PICTURE_STYLES}
      value={pillOf(style)}
      onChange={onChange}
    />
  );
}
