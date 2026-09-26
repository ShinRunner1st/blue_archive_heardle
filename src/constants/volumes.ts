import vol1 from "../image/badges/vol1.webp";
import vol2 from "../image/badges/vol2.webp";
import vol3 from "../image/badges/vol3.webp";
import vol4 from "../image/badges/vol4.webp";
import vol5 from "../image/badges/vol5.webp";
import vol6 from "../image/badges/vol6.webp";
import vol7 from "../image/badges/vol7.webp";
import vol8 from "../image/badges/vol8.webp";

/** One of the game's official soundtrack albums, as a badge to earn. */
export interface Volume {
  number: number;
  /** The album's subtitle. */
  title: string;
  cover: string;
  /** Theme numbers of its songs that are in the game. */
  songs: string[];
}

const themes = (list: string) => list.split(" ");

/**
 * Blue Archive Original Soundtrack Vol.1-8, from their published tracklists.
 * A song can be on two albums (Water Drop, 39, is on Vol.1 and Vol.2). Vol.7's
 * "Train Showdown" isn't in the game, so it can't be asked for or counted.
 */
export const VOLUMES: Volume[] = [
  {
    number: 1,
    title: "Longing for the memorable days",
    cover: vol1,
    songs: themes(
      "1 3 9 11 12 14 16 17 18 19 20 22 23 24 25 26 27 28 29 30 39 41 45 46 48 49 51 52 53 54 56 58 61 65 71 72 76 78 85"
    ),
  },
  {
    number: 2,
    title: "Searching for the unknown truth",
    cover: vol2,
    songs: themes(
      "2 5 13 31 32 33 36 39 40 50 64 67 69 70 92 93 94 95 96 98 100"
    ),
  },
  {
    number: 3,
    title: "Reaching for the precious time",
    cover: vol3,
    songs: themes(
      "4 10 15 21 34 35 37 38 42 44 47 55 59 80 82 87 91 101 105 109 110 118 119 125 128 136"
    ),
  },
  {
    number: 4,
    title: "Aiming for the ideal freedom",
    cover: vol4,
    songs: themes(
      "6 7 8 60 68 73 74 75 79 81 86 106 107 108 129 130 141 142 148 149 150 151 152 154 155 156 157 162"
    ),
  },
  {
    number: 5,
    title: "Striving for the bloomy festival",
    cover: vol5,
    songs: themes(
      "43 57 77 102 103 104 116 117 120 121 123 124 127 131 132 133 134 135 143 145 176 177 178 181 190 195 196"
    ),
  },
  {
    number: 6,
    title: "Keeping for the abiding belief",
    cover: vol6,
    songs: themes(
      "63 113 114 115 138 139 159 160 163 164 165 167 168 170 173 174 175 183 187 188 191 192 193 194 199 201 204 205"
    ),
  },
  {
    number: 7,
    title: "Harmonizing for the hearts of each",
    cover: vol7,
    songs: themes(
      "66 88 89 158 161 171 172 189 197 203 206 207 208 212 216 217 218 220 221 222 224 226 228 229 234 236 245"
    ),
  },
  {
    number: 8,
    title: "Dreaming for the Melody of Revolution",
    cover: vol8,
    songs: themes(
      "62 83 84 99 169 186 198 202 210 214 215 219 223 235 237 239 240 241 247 249 250 251 252 253 255 256 257 262"
    ),
  },
];
