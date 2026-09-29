/**
 * Draws a student's halo from their sprite, the Spine skeleton the game
 * shows them with, read with spine-core (4.2, the version of the game's
 * sprites and of the characters on the page).
 *
 * A halo is often several pieces: its parts, and a copy of some drawn with
 * additive blending for the glow. Every slot whose name has "halo" in it is
 * drawn, in draw order, with its colour. The glow copies are left out: over
 * the game's picture they brighten the halo, but on a clear background they
 * add up to white. A halo that is only glow is drawn from those.
 *
 * On the sprite a halo sits in perspective, often nearly edge-on, while its
 * pieces' textures are drawn flat, facing us, as the Fandom wiki shows
 * halos. So the halo is drawn flat: how the sprite squashes and turns each
 * piece's texture is measured (an affine fit of its mesh), and the average of
 * that is undone for the whole halo. Each piece comes out as its texture
 * draws it, and the pieces stay where they are to one another.
 *
 * Cutting the pieces out of the texture page instead wouldn't do: older
 * sprites pack other pieces (eyes, strands of hair) into the empty corners
 * of a halo's box, and a halo of several pieces has to be put together.
 *
 * No GPU or canvas: each triangle is filled here, a pixel at a time, with
 * the texture sampled between pixels, plenty for a few hundred pixels.
 */
import * as spine from "@esotericsoftware/spine-core";

class NoTexture extends spine.Texture {
  setFilters() {}
  setWraps() {}
  dispose() {}
}

const HALO_SLOT = /halo/i;

/** The skeleton in its resting pose; throws if it can't be read. */
function loadSkeleton(atlasText, skelBytes) {
  const atlas = new spine.TextureAtlas(atlasText);
  for (const page of atlas.pages) {
    page.setTexture(new NoTexture({ width: page.width, height: page.height }));
  }
  const binary = new spine.SkeletonBinary(
    new spine.AtlasAttachmentLoader(atlas)
  );
  const skeleton = new spine.Skeleton(binary.readSkeletonData(skelBytes));
  skeleton.setToSetupPose();
  skeleton.updateWorldTransform(spine.Physics.update);
  return skeleton;
}

/**
 * Where a vertex is in its piece's own picture, upright, in pixels: its
 * place on the page, turned back if the atlas packed the piece turned.
 */
function flatPoint(region, u, v) {
  const x = u * region.page.width - region.x;
  const y = v * region.page.height - region.y;
  switch (region.degrees) {
    case 90:
      return [y, region.height - x];
    case 180:
      return [region.width - x, region.height - y];
    case 270:
      return [region.width - y, x];
    default:
      return [x, y];
  }
}

/** Each halo piece showing: its triangles on the sprite and on its page. */
function haloPieces(skeleton) {
  const pieces = [];
  for (const slot of skeleton.drawOrder) {
    if (!HALO_SLOT.test(slot.data.name)) continue;
    const attachment = slot.getAttachment();
    const color = slot.color;
    if (!attachment?.region || color.a <= 0) continue;
    let world;
    let triangles;
    if (attachment instanceof spine.RegionAttachment) {
      world = new Float32Array(8);
      attachment.computeWorldVertices(slot, world, 0, 2);
      triangles = [0, 1, 2, 2, 3, 0];
    } else if (attachment instanceof spine.MeshAttachment) {
      world = new Float32Array(attachment.worldVerticesLength);
      attachment.computeWorldVertices(
        slot,
        0,
        attachment.worldVerticesLength,
        world,
        0,
        2
      );
      triangles = attachment.triangles;
    } else {
      continue;
    }
    const { region, uvs } = attachment;
    const flat = [];
    for (let i = 0; i < uvs.length; i += 2) {
      flat.push(flatPoint(region, uvs[i], uvs[i + 1]));
    }
    const tint = attachment.color;
    pieces.push({
      page: region.page.name,
      world,
      flat,
      uvs,
      triangles,
      additive: slot.data.blendMode === spine.BlendMode.Additive,
      color: [
        color.r * tint.r,
        color.g * tint.g,
        color.b * tint.b,
        color.a * tint.a,
      ],
    });
  }
  return pieces;
}

/** Solves a 3x3 system by elimination; null if it has no single answer. */
function solve3(m, rhs) {
  const a = m.map((row, i) => [...row, rhs[i]]);
  for (let col = 0; col < 3; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < 3; row += 1) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    }
    if (Math.abs(a[pivot][col]) < 1e-9) return null;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    for (let row = 0; row < 3; row += 1) {
      if (row === col) continue;
      const f = a[row][col] / a[col][col];
      for (let k = col; k < 4; k += 1) a[row][k] -= f * a[col][k];
    }
  }
  return a.map((row, i) => row[3] / a[i][i]);
}

/**
 * How the sprite turns a piece's flat picture into its place on the sprite:
 * the 2x2 part of the affine map that fits its vertices best, or null.
 */
function fitPiece({ flat, world }) {
  const m = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const bx = [0, 0, 0];
  const by = [0, 0, 0];
  flat.forEach(([x, y], i) => {
    const row = [x, y, 1];
    for (let r = 0; r < 3; r += 1) {
      for (let c = 0; c < 3; c += 1) m[r][c] += row[r] * row[c];
      bx[r] += row[r] * world[i * 2];
      by[r] += row[r] * world[i * 2 + 1];
    }
  });
  const px = solve3(m, bx);
  const py = solve3(m, by);
  if (!px || !py) return null;
  return [px[0], px[1], py[0], py[1]];
}

/**
 * The map that undoes the sprite's squash and turn: the inverse of the
 * pieces' average fit, weighted by their size. Null when there is nothing to
 * undo it from, and the halo is drawn as it sits.
 */
function unsquash(pieces) {
  const sum = [0, 0, 0, 0];
  let total = 0;
  for (const piece of pieces) {
    const fit = fitPiece(piece);
    if (!fit) continue;
    const xs = piece.flat.map(([x]) => x);
    const ys = piece.flat.map(([, y]) => y);
    const weight =
      (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
    fit.forEach((value, i) => (sum[i] += value * weight));
    total += weight;
  }
  if (total <= 0) return null;
  const [a, b, c, d] = sum.map((value) => value / total);
  const det = a * d - b * c;
  if (Math.abs(det) < 1e-9) return null;
  return [d / det, -b / det, -c / det, a / det];
}

/** How many texture pixels a unit of `points` is, so nothing is scaled. */
function pixelScale(pieces, points, textures) {
  const ratios = [];
  pieces.forEach(({ page, uvs, triangles }, p) => {
    const { width, height } = textures.get(page);
    const at = points[p];
    for (let t = 0; t < triangles.length; t += 3) {
      const ids = [triangles[t], triangles[t + 1], triangles[t + 2]];
      const area = (xs, ys) =>
        Math.abs(
          (xs[1] - xs[0]) * (ys[2] - ys[0]) - (xs[2] - xs[0]) * (ys[1] - ys[0])
        );
      const drawn = area(
        ids.map((i) => at[i * 2]),
        ids.map((i) => at[i * 2 + 1])
      );
      const texture = area(
        ids.map((i) => uvs[i * 2] * width),
        ids.map((i) => uvs[i * 2 + 1] * height)
      );
      if (drawn > 1e-6 && texture > 1e-6) {
        ratios.push(Math.sqrt(texture / drawn));
      }
    }
  });
  ratios.sort((x, y) => x - y);
  return ratios[Math.floor(ratios.length / 2)] ?? 1;
}

/** The texture's colour at (u, v) in pixels, between pixels: RGBA, 0-1. */
function sample({ width, height, data }, u, v, out) {
  const x = Math.min(Math.max(u - 0.5, 0), width - 1);
  const y = Math.min(Math.max(v - 0.5, 0), height - 1);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, width - 1);
  const y1 = Math.min(y0 + 1, height - 1);
  const fx = x - x0;
  const fy = y - y0;
  // Weighted by transparency, so a clear pixel's colour doesn't bleed in.
  let r = 0;
  let g = 0;
  let b = 0;
  let a = 0;
  for (const [px, py, w] of [
    [x0, y0, (1 - fx) * (1 - fy)],
    [x1, y0, fx * (1 - fy)],
    [x0, y1, (1 - fx) * fy],
    [x1, y1, fx * fy],
  ]) {
    const i = (py * width + px) * 4;
    const alpha = (data[i + 3] / 255) * w;
    r += (data[i] / 255) * alpha;
    g += (data[i + 1] / 255) * alpha;
    b += (data[i + 2] / 255) * alpha;
    a += alpha;
  }
  out[3] = a;
  if (a > 0) {
    out[0] = r / a;
    out[1] = g / a;
    out[2] = b / a;
  }
  return out;
}

/**
 * The halo, flat, as { width, height, data } (RGBA bytes) at the texture's
 * own size, or null when the sprite has no halo showing. `textures` maps
 * each of the atlas's pages, by name, to its pixels. Throws if the sprite
 * can't be read (a newer Spine than spine-core's, say).
 */
export function renderHalo(atlasText, skelBytes, textures) {
  const skeleton = loadSkeleton(atlasText, skelBytes);
  const all = haloPieces(skeleton).filter(({ page }) => textures.has(page));
  if (all.length === 0) return null;
  const solid = all.filter(({ additive }) => !additive);
  const pieces = solid.length > 0 ? solid : all;

  // Each piece's vertices, flattened: the sprite's squash and turn undone,
  // in picture coordinates (y down). Without a fit, as on the sprite, with
  // its y (up) turned down.
  const undo = unsquash(pieces) ?? [1, 0, 0, -1];
  const points = pieces.map(({ world }) => {
    const out = new Float32Array(world.length);
    for (let i = 0; i < world.length; i += 2) {
      out[i] = undo[0] * world[i] + undo[1] * world[i + 1];
      out[i + 1] = undo[2] * world[i] + undo[3] * world[i + 1];
    }
    return out;
  });

  const scale = pixelScale(pieces, points, textures);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const at of points) {
    for (let i = 0; i < at.length; i += 2) {
      minX = Math.min(minX, at[i]);
      maxX = Math.max(maxX, at[i]);
      minY = Math.min(minY, at[i + 1]);
      maxY = Math.max(maxY, at[i + 1]);
    }
  }
  const pad = 2;
  const width = Math.ceil((maxX - minX) * scale) + pad * 2;
  const height = Math.ceil((maxY - minY) * scale) + pad * 2;
  if (!(width * height <= 4096 * 4096)) throw new Error("halo too big to draw");

  // Premultiplied, so pieces over one another blend as the game's do.
  const canvas = new Float32Array(width * height * 4);
  const texel = new Float32Array(4);

  pieces.forEach(({ page, uvs, triangles, color }, p) => {
    const texture = textures.get(page);
    const at = points[p];
    for (let t = 0; t < triangles.length; t += 3) {
      const ids = [triangles[t], triangles[t + 1], triangles[t + 2]];
      const xs = ids.map((i) => (at[i * 2] - minX) * scale + pad);
      const ys = ids.map((i) => (at[i * 2 + 1] - minY) * scale + pad);
      const us = ids.map((i) => uvs[i * 2] * texture.width);
      const vs = ids.map((i) => uvs[i * 2 + 1] * texture.height);
      const area =
        (xs[1] - xs[0]) * (ys[2] - ys[0]) - (xs[2] - xs[0]) * (ys[1] - ys[0]);
      if (Math.abs(area) < 1e-9) continue;
      const left = Math.max(0, Math.floor(Math.min(...xs)));
      const right = Math.min(width - 1, Math.ceil(Math.max(...xs)));
      const top = Math.max(0, Math.floor(Math.min(...ys)));
      const bottom = Math.min(height - 1, Math.ceil(Math.max(...ys)));
      for (let py = top; py <= bottom; py += 1) {
        for (let px = left; px <= right; px += 1) {
          const cx = px + 0.5;
          const cy = py + 0.5;
          // Barycentric weights: inside the triangle if none is negative.
          const w0 =
            ((xs[1] - cx) * (ys[2] - cy) - (xs[2] - cx) * (ys[1] - cy)) / area;
          const w1 =
            ((xs[2] - cx) * (ys[0] - cy) - (xs[0] - cx) * (ys[2] - cy)) / area;
          const w2 = 1 - w0 - w1;
          if (w0 < 0 || w1 < 0 || w2 < 0) continue;
          sample(
            texture,
            w0 * us[0] + w1 * us[1] + w2 * us[2],
            w0 * vs[0] + w1 * vs[1] + w2 * vs[2],
            texel
          );
          const alpha = texel[3] * color[3];
          if (alpha <= 0) continue;
          const i = (py * width + px) * 4;
          for (let c = 0; c < 3; c += 1) {
            canvas[i + c] =
              texel[c] * color[c] * alpha + canvas[i + c] * (1 - alpha);
          }
          canvas[i + 3] = alpha + canvas[i + 3] * (1 - alpha);
        }
      }
    }
  });

  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < canvas.length; i += 4) {
    const a = Math.min(canvas[i + 3], 1);
    if (a <= 0) continue;
    for (let c = 0; c < 3; c += 1) {
      data[i + c] = Math.round(Math.min(canvas[i + c] / a, 1) * 255);
    }
    data[i + 3] = Math.round(a * 255);
  }
  return { width, height, data };
}
