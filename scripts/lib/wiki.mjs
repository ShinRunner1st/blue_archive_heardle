import { writeFileSync } from "node:fs";

const HEADERS = { "User-Agent": "baheardle.com build script" };

/**
 * Downloads one of the game's scenario backgrounds, File:BG_<name>.jpg, from
 * the Blue Archive wiki to `file`. Only the build scripts do this, once; the
 * game never asks the wiki for anything.
 */
export async function downloadBackground(name, file) {
  const api = new URL("https://bluearchive.wiki/w/api.php");
  api.search = new URLSearchParams({
    action: "query",
    titles: `File:BG_${name}.jpg`,
    prop: "imageinfo",
    iiprop: "url",
    format: "json",
  });
  const data = await (await fetch(api, { headers: HEADERS })).json();
  const url = Object.values(data.query.pages)[0].imageinfo?.[0]?.url;
  if (!url) throw new Error(`No File:BG_${name}.jpg on the wiki`);
  const image = await fetch(url, { headers: HEADERS });
  if (!image.ok) throw new Error(`${url}: ${image.status}`);
  writeFileSync(file, Buffer.from(await image.arrayBuffer()));
}
