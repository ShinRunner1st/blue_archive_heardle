/**
 * Makes the pictures of every season in src/content/seasons.json that
 * doesn't have them yet, by day and by night, from the game's backgrounds
 * its `scene` names (see make-backdrop.mjs), then lists them for the game.
 * Pictures already made are left alone, so editing a season's dates never
 * redraws it; delete a picture to have it made again.
 *
 *   npm run seasons        then   npm run songs
 *
 * Needs ffmpeg on the PATH, built with libwebp.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const seasons = JSON.parse(readFileSync("src/content/seasons.json", "utf8"));

let made = 0;
for (const { id, pictures = id, scene } of seasons) {
  for (const time of ["day", "night"]) {
    const file = `pictures/seasons/${pictures}-${time}.webp`;
    if (existsSync(file)) continue;
    execFileSync(
      process.execPath,
      ["scripts/make-backdrop.mjs", scene[time], time, file],
      { stdio: "inherit" }
    );
    made++;
  }
}
console.log(
  made > 0
    ? `Made ${made} season pictures. Run npm run songs to put them on the Worker.`
    : "Every season has its pictures."
);
