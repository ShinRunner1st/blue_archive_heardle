/**
 * Draws a student's halo from their 3D model, the chibi the game battles
 * with, for a student whose sprite has none to draw it from (see gameHalos
 * in gameFiles.mjs). scripts/extract-game-files.py's `models` gives the
 * halo's pieces, placed on the model.
 *
 * The halo is a flat shape tilted behind the head. It is drawn square on:
 * seen along its plane's normal (the direction its vertices spread least),
 * from the side the student faces, with the model's up as up. That is how
 * the Fandom wiki draws them, and so they come out alike (checked against
 * 141 of the wiki's).
 *
 * The colour is the texture's own, a little lighter: the game's shader
 * lights and tints it too, but the texture alone came closer to the wiki's
 * pictures than any mix with the material's colours (and the lift closer
 * still, for the wiki's glow).
 */
import { sample } from "./spineHalo.mjs";

/** How big the halo's longer side is drawn, in pixels. */
const SIZE = 512;
/** Drawn this many times bigger, then shrunk, for smooth edges. */
const SUPER = 2;
/** The colour's lift: each channel to this power (below 1 lightens). */
const LIFT = 0.8;

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const normalize = (v) => {
  const length = Math.hypot(...v);
  return v.map((x) => x / length);
};

/**
 * The eigenvector of a symmetric 3x3 matrix with the smallest eigenvalue,
 * by Jacobi rotations: the direction the points spread least in.
 */
function leastSpread(m) {
  const a = m.map((row) => [...row]);
  const v = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  for (let sweep = 0; sweep < 50; sweep += 1) {
    let off = 0;
    for (const [p, q] of [
      [0, 1],
      [0, 2],
      [1, 2],
    ]) {
      off += Math.abs(a[p][q]);
      if (Math.abs(a[p][q]) < 1e-15) continue;
      const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
      const t =
        Math.sign(theta || 1) /
        (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const c = 1 / Math.sqrt(t * t + 1);
      const s = t * c;
      for (let k = 0; k < 3; k += 1) {
        const akp = a[k][p];
        const akq = a[k][q];
        a[k][p] = c * akp - s * akq;
        a[k][q] = s * akp + c * akq;
      }
      for (let k = 0; k < 3; k += 1) {
        const apk = a[p][k];
        const aqk = a[q][k];
        a[p][k] = c * apk - s * aqk;
        a[q][k] = s * apk + c * aqk;
      }
      for (let k = 0; k < 3; k += 1) {
        const vkp = v[k][p];
        const vkq = v[k][q];
        v[k][p] = c * vkp - s * vkq;
        v[k][q] = s * vkp + c * vkq;
      }
    }
    if (off < 1e-15) break;
  }
  const least = [0, 1, 2].reduce((best, i) =>
    a[i][i] < a[best][best] ? i : best
  );
  return [v[0][least], v[1][least], v[2][least]];
}

/**
 * The way the halo is seen: its centre, its normal towards the viewer, and
 * the picture's right and up.
 */
function view(points) {
  const centre = [0, 1, 2].map(
    (axis) => points.reduce((sum, p) => sum + p[axis], 0) / points.length
  );
  const m = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (const p of points) {
    const d = p.map((x, axis) => x - centre[axis]);
    for (let r = 0; r < 3; r += 1) {
      for (let c = 0; c < 3; c += 1) m[r][c] += d[r] * d[c];
    }
  }
  let normal = normalize(leastSpread(m));
  // A halo lying flat is seen from above, the student's front at the
  // bottom; otherwise from the side the student faces (+z).
  const flat = Math.abs(normal[1]) > 0.95;
  if (flat ? normal[1] < 0 : normal[2] < 0) normal = normal.map((x) => -x);
  const along = flat ? [0, 0, -1] : [0, 1, 0];
  const up = normalize(along.map((x, i) => x - normal[i] * dot(along, normal)));
  const right = cross(
    up,
    normal.map((x) => -x)
  );
  return { centre, normal, right, up };
}

/**
 * The halo, flat, as { width, height, data } (RGBA bytes), or null when
 * there are no pieces. `textures` maps each piece's texture file to its
 * pixels; a piece without one is drawn white.
 */
export function renderModelHalo(pieces, textures) {
  const shown = pieces.filter(
    ({ vertices, triangles }) => vertices.length > 0 && triangles.length > 0
  );
  if (shown.length === 0) return null;
  const { centre, normal, right, up } = view(shown.flatMap((p) => p.vertices));

  // Each vertex on the picture (x right, y down) and its depth (bigger is
  // nearer the viewer).
  const placed = shown.map(({ vertices }) =>
    vertices.map((p) => {
      const d = p.map((x, axis) => x - centre[axis]);
      return [dot(d, right), -dot(d, up), dot(d, normal)];
    })
  );
  const all = placed.flat();
  const minX = Math.min(...all.map(([x]) => x));
  const maxX = Math.max(...all.map(([x]) => x));
  const minY = Math.min(...all.map(([, y]) => y));
  const maxY = Math.max(...all.map(([, y]) => y));
  const span = Math.max(maxX - minX, maxY - minY);
  if (!(span > 0)) return null;
  const pad = 2 * SUPER;
  const scale = (SIZE * SUPER) / span;
  const bigW = Math.ceil((maxX - minX) * scale) + pad * 2;
  const bigH = Math.ceil((maxY - minY) * scale) + pad * 2;

  const colour = new Float32Array(bigW * bigH * 4);
  const depth = new Float32Array(bigW * bigH).fill(-Infinity);
  const texel = new Float32Array(4);
  const white = {
    width: 1,
    height: 1,
    data: new Uint8Array([255, 255, 255, 255]),
  };

  shown.forEach(({ uvs, triangles, texture: file }, p) => {
    const texture = (file && textures.get(file)) || white;
    const at = placed[p];
    for (const ids of triangles) {
      const xs = ids.map((i) => (at[i][0] - minX) * scale + pad);
      const ys = ids.map((i) => (at[i][1] - minY) * scale + pad);
      const zs = ids.map((i) => at[i][2]);
      // Unity's v runs up the texture; the pixels run down.
      const us = ids.map((i) => uvs[i][0] - Math.floor(uvs[i][0]));
      const vs = ids.map((i) => 1 - (uvs[i][1] - Math.floor(uvs[i][1])));
      const area =
        (xs[1] - xs[0]) * (ys[2] - ys[0]) - (xs[2] - xs[0]) * (ys[1] - ys[0]);
      if (Math.abs(area) < 1e-9) continue;
      const left = Math.max(0, Math.floor(Math.min(...xs)));
      const rightEdge = Math.min(bigW - 1, Math.ceil(Math.max(...xs)));
      const top = Math.max(0, Math.floor(Math.min(...ys)));
      const bottom = Math.min(bigH - 1, Math.ceil(Math.max(...ys)));
      for (let py = top; py <= bottom; py += 1) {
        for (let px = left; px <= rightEdge; px += 1) {
          const cx = px + 0.5;
          const cy = py + 0.5;
          const w0 =
            ((xs[1] - cx) * (ys[2] - cy) - (xs[2] - cx) * (ys[1] - cy)) / area;
          const w1 =
            ((xs[2] - cx) * (ys[0] - cy) - (xs[0] - cx) * (ys[2] - cy)) / area;
          const w2 = 1 - w0 - w1;
          if (w0 < 0 || w1 < 0 || w2 < 0) continue;
          const z = w0 * zs[0] + w1 * zs[1] + w2 * zs[2];
          const i = py * bigW + px;
          if (z <= depth[i]) continue;
          sample(
            texture,
            (w0 * us[0] + w1 * us[1] + w2 * us[2]) * texture.width,
            (w0 * vs[0] + w1 * vs[1] + w2 * vs[2]) * texture.height,
            texel
          );
          if (texel[3] <= 0) continue;
          depth[i] = z;
          for (let c = 0; c < 3; c += 1) colour[i * 4 + c] = texel[c] ** LIFT;
          colour[i * 4 + 3] = texel[3];
        }
      }
    }
  });

  // Shrunk by averaging each SUPER x SUPER block, colour weighted by
  // coverage, so the edges come out smooth.
  const width = Math.ceil(bigW / SUPER);
  const height = Math.ceil(bigH / SUPER);
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sum = [0, 0, 0, 0];
      for (let dy = 0; dy < SUPER; dy += 1) {
        for (let dx = 0; dx < SUPER; dx += 1) {
          const bx = x * SUPER + dx;
          const by = y * SUPER + dy;
          if (bx >= bigW || by >= bigH) continue;
          const i = (by * bigW + bx) * 4;
          const a = colour[i + 3];
          for (let c = 0; c < 3; c += 1) sum[c] += colour[i + c] * a;
          sum[3] += a;
        }
      }
      const o = (y * width + x) * 4;
      if (sum[3] <= 0) continue;
      for (let c = 0; c < 3; c += 1) {
        data[o + c] = Math.round(Math.min(sum[c] / sum[3], 1) * 255);
      }
      data[o + 3] = Math.round((sum[3] / (SUPER * SUPER)) * 255);
    }
  }
  return { width, height, data };
}
