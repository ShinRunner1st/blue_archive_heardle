/**
 * A picture's pixels as RGBA bytes, read and written with ffmpeg, which the
 * build scripts already need: no image library to install.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

/** Any picture ffmpeg reads, as { width, height, data } (RGBA bytes). */
export async function readPixels(file) {
  const { stdout: probe } = await run("ffprobe", [
    ...["-v", "error", "-select_streams", "v:0"],
    ...["-show_entries", "stream=width,height", "-of", "csv=p=0", file],
  ]);
  const [width, height] = probe.trim().split(",").map(Number);
  const { stdout } = await run(
    "ffmpeg",
    [
      ...["-v", "error", "-i", file, "-frames:v", "1"],
      ...["-f", "rawvideo", "-pix_fmt", "rgba", "-"],
    ],
    { encoding: "buffer", maxBuffer: 1 << 30 }
  );
  return { width, height, data: stdout };
}

/** Writes RGBA pixels as a PNG. */
export async function writePng(file, { width, height, data }) {
  await new Promise((resolve, reject) => {
    const child = execFile(
      "ffmpeg",
      [
        ...["-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba"],
        ...["-s", `${width}x${height}`, "-i", "-", "-frames:v", "1", file],
      ],
      (error) => (error ? reject(error) : resolve())
    );
    child.stdin.end(Buffer.from(data.buffer, data.byteOffset, data.length));
  });
}
