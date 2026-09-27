import dayImage from "../image/image.webp";
import nightImage from "../image/BG_TrinityOldLibrary_Night.webp";

export type ColorScheme = "light" | "dark";

/** The day library: warm browns. */
export const theme = {
  border: "#F1F7ED",
  border100: "#38220f",

  text: "#FFFFFF",
  background100: "#634832",
  background1: "#38220f",

  green: "#4DBB60",
  red: "#FF0000",
  gray: "#E6E6E6",
  orange: "#FFA500",
  /** Blue Archive's own blue, for buttons that share text. */
  blue: "#128AFA",
  /** MomoTalk's pink, for buttons that share a picture. */
  pink: "#EC6A8C",

  /** Dims the page behind a pop-up. */
  overlay: "rgba(18, 10, 4, 0.72)",
  /** Background1 at half strength, for cards inside pop-ups. */
  surface: "rgba(56, 34, 15, 0.5)",
  /** Painted behind the whole page. */
  backgroundImage: dayImage,
};

export type Theme = typeof theme;

/**
 * The same library at night. Every colour is taken from the night artwork's
 * own deep indigo and plum, so the panels sit in the scene rather than on it.
 */
export const darkTheme: Theme = {
  border: "#E4E1F5",
  border100: "#120F22",

  text: "#FFFFFF",
  background100: "#2B2746",
  background1: "#161328",

  green: "#4DBB60",
  red: "#FF4D4D",
  gray: "#C8C5DC",
  orange: "#FFA500",
  /** Blue Archive's own blue, for buttons that share text. */
  blue: "#128AFA",
  /** MomoTalk's pink, for buttons that share a picture. */
  pink: "#EC6A8C",

  overlay: "rgba(8, 6, 20, 0.72)",
  surface: "rgba(22, 19, 40, 0.5)",
  backgroundImage: nightImage,
};

export const themes: Record<ColorScheme, Theme> = {
  light: theme,
  dark: darkTheme,
};
