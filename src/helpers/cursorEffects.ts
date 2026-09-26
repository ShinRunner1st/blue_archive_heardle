/**
 * Blue Archive's tap and drag effect, drawn on one full-screen canvas that
 * ignores the pointer. A tap flashes a blue disc, spins two rings out round
 * it and scatters four blinking triangles; a drag leaves a glowing trail with
 * triangles along it. Works for mouse, pen and touch.
 *
 * Timings, sizes and colours were measured frame by frame from 60fps
 * full-HD footage of the game, at the same scale as the page: a tap is over
 * in a third of a second.
 *
 * Glows are wider, fainter copies of a shape rather than shadowBlur, which
 * is slow enough to drop frames when taps pile up.
 */

type Stop = readonly [at: number, value: number];
/** A glow layer: extra width in px, and its opacity. */
type Glow = readonly [extra: number, alpha: number];

/** Every size (px), duration (s), speed (px/s) and colour, to tune here. */
export const CONFIG = {
  maxParticles: 300,

  /** A solid disc under everything else (FX_TEX_Circle_01). */
  flash: {
    life: 0.21,
    /** Full diameter. The rings ride its edge while it lasts. */
    size: 112,
    /** Quick at first, then slowly out to full size. */
    scale: [
      [0, 0.53],
      [0.083, 0.63],
      [0.25, 0.74],
      [0.5, 0.87],
      [0.75, 0.93],
      [1, 1],
    ] as Stop[],
    colorStart: "#FFFFFF",
    color: "#3D63FF",
    /** Fully blue by this share of its life. */
    colorBy: 0.08,
    /** Solid until this share of its life, then gone almost at once. */
    fadeFrom: 0.9,
    /** Width of the soft edge, as a share of the radius. */
    softEdge: 0.04,
    glow: 14,
  },

  /** Two open arcs that turn as they spread (FX_TEX_Grad_Ring3). */
  ring: {
    count: 2,
    life: 0.33,
    /** Full radius. */
    size: 66,
    /** The second ring's size, relative to the first, and how far (in
     * radians) its arc may face from the first's. */
    inner: 0.95,
    offset: Math.PI,
    scale: [
      [0, 0.46],
      [0.1, 0.61],
      [0.2, 0.69],
      [0.3, 0.76],
      [0.4, 0.8],
      [0.6, 0.88],
      [0.8, 0.96],
      [1, 1],
    ] as Stop[],
    /** Share of the circle drawn: it swells almost closed, then shrinks. */
    arc: [
      [0, 0.1],
      [0.05, 0.35],
      [0.25, 0.95],
      [0.4, 0.9],
      [0.6, 0.72],
      [0.8, 0.42],
      [1, 0.3],
    ] as Stop[],
    /** Share of the arc, at each end, that tapers away. */
    taper: 0.15,
    /** Starting speed in degrees a second, turning anticlockwise; it eases
     * out to a stop. */
    spin: 640,
    stroke: 3.5,
    glow: [
      [12, 0.12],
      [6, 0.3],
    ] as Glow[],
    colorStart: "#FFFFFF",
    color: "#4DA6FF",
    colorFrom: 0.11,
    colorBy: 0.5,
    /** How much whiter the ring's core stays than its tinted glow. */
    coreWhite: 0.85,
    fadeFrom: 0.92,
  },

  /** Filled triangles pointing up or down (FX_TEX_Triangle_02_1). */
  shard: {
    /** Grows in, then holds its size. */
    scale: [
      [0, 0],
      [0.22, 1],
      [1, 0.9],
    ] as Stop[],
    colorStart: "#FFFFFF",
    color: "#5EC4FF",
    colorFrom: 0.4,
    /** Opacity over its life: steady, then one slow blink, then out. */
    opacity: [
      [0, 1],
      [0.5, 1],
      [0.62, 0.15],
      [0.78, 0.8],
      [0.92, 0.4],
      [1, 0],
    ] as Stop[],
    /** Each shard blinks up to this much of its life early or late, so they
     * don't blink in step. */
    phase: 0.05,
    /** `size` is the triangle's width; each spawns somewhere between the
     * two radii round the pointer. */
    tap: {
      count: 4,
      size: [14, 22],
      radius: [43, 62],
      speed: [25, 32],
      life: [0.3, 0.34],
    },
    /** One shard for every `every` px dragged. */
    drag: {
      every: 90,
      size: [18, 26],
      radius: [0, 28],
      speed: [20, 30],
      life: [0.3, 0.45],
    },
  },

  /** A thin line tapering off behind the pointer (FX_TEX_Trail_03). */
  trail: {
    /** How long each point lives. */
    life: 0.3,
    /** Distance the pointer must move before a new point is added. */
    minStep: 1,
    /** Width at the head; it tapers to nothing at the tail. */
    width: 4,
    glow: [
      [10, 0.12],
      [4, 0.3],
    ] as Glow[],
    /** The glow, along the line from head (0) to tail (1). */
    colors: [
      [0, "#0063FF"],
      [0.42, "#001747"],
      [1, "#000000"],
    ] as const,
    /** The bright core over the glow, and how far along it fades out. */
    core: "#5EE4FF",
    coreLength: 0.7,
    /** Soft halo round the head. */
    halo: { radius: 26, color: "#0063FF", alpha: 0.35 },
  },
};

/** Linear interpolation through `stops` at progress `p`. */
export function interpolate(stops: readonly Stop[], p: number): number {
  if (p <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    const [at, value] = stops[i];
    if (p <= at) {
      const [prevAt, prevValue] = stops[i - 1];
      return prevValue + ((value - prevValue) * (p - prevAt)) / (at - prevAt);
    }
  }
  return stops[stops.length - 1][1];
}

/** A shard's opacity at `t` through its life, its blink moved by `phase`. */
export function shardAlpha(t: number, phase = 0): number {
  // Only the blink moves: the steady start and the end stay put.
  const moved = t < 0.5 || t > 0.92 ? t : t + phase;
  return interpolate(CONFIG.shard.opacity, moved);
}

function channels(hex: string): number[] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** `from` blended towards `to` by `t`, clamped to 0-1, as `r,g,b`. */
export function mix(from: string, to: string, t: number): string {
  const a = channels(from);
  const b = channels(to);
  const k = Math.min(Math.max(t, 0), 1);
  return a.map((c, i) => Math.round(c + (b[i] - c) * k)).join(",");
}

type Kind = "flash" | "ring" | "shard";

interface Particle {
  kind: Kind;
  alive: boolean;
  x: number;
  y: number;
  born: number;
  life: number;
  /** Ring: starting rotation. Shard: direction it flies. */
  angle: number;
  /** Shard: px/s. */
  speed: number;
  /** Ring: radius relative to the full size. Shard: width. */
  size: number;
  /** Shard: points down rather than up. */
  flip: boolean;
  /** Shard: how early or late it blinks. */
  phase: number;
}

interface Point {
  x: number;
  y: number;
  born: number;
}

interface Trail {
  points: Point[];
  /** Distance dragged since the last shard. */
  sinceShard: number;
}

const TAU = Math.PI * 2;
/** Pieces each tapering end of a ring is drawn in. */
const TAPER_PIECES = 8;

const within = ([min, max]: readonly number[]) =>
  min + Math.random() * (max - min);

/** 0 to 1 over the fade that closes a life, from `from` on. */
const fadeOut = (t: number, from: number) =>
  t < from ? 1 : 1 - (t - from) / (1 - from);

/**
 * Lays the effect's canvas over the page and starts listening. Returns a
 * function that stops it and removes the canvas.
 */
export function startCursorEffects(): () => void {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: "9999",
  });
  // "lighter" only adds up what is on the canvas; this adds the canvas to the
  // page too, so the glow brightens what is under it and black shows nothing.
  // Screen is the nearest fallback where plus-lighter is unsupported.
  canvas.style.mixBlendMode = "screen";
  canvas.style.mixBlendMode = "plus-lighter";

  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  document.body.appendChild(canvas);

  const pool: Particle[] = [];
  /** Trails of pointers still down, by pointer id. */
  const active = new Map<number, Trail>();
  /** Trails whose pointer is up, left to fade out. */
  const fading: Trail[] = [];
  let width = 0;
  let height = 0;
  let frame = 0;

  const now = () => performance.now() / 1000;

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  /** Reuses a dead particle, or adds one while under the cap. */
  const spawn = (fields: Omit<Particle, "alive" | "born">) => {
    let particle = pool.find((p) => !p.alive);
    if (!particle) {
      if (pool.length >= CONFIG.maxParticles) return;
      particle = {} as Particle;
      pool.push(particle);
    }
    Object.assign(particle, fields, { alive: true, born: now() });
  };

  const spawnShard = (
    x: number,
    y: number,
    angle: number,
    kind: {
      size: readonly number[];
      speed: readonly number[];
      life: readonly number[];
    }
  ) =>
    spawn({
      kind: "shard",
      x,
      y,
      angle,
      speed: within(kind.speed),
      life: within(kind.life),
      size: within(kind.size),
      flip: Math.random() < 0.5,
      phase: (Math.random() * 2 - 1) * CONFIG.shard.phase,
    });

  const tap = (x: number, y: number) => {
    const blank = { angle: 0, speed: 0, size: 1, flip: false, phase: 0 };
    spawn({ ...blank, kind: "flash", x, y, life: CONFIG.flash.life });

    const { ring } = CONFIG;
    const facing = Math.random() * TAU;
    for (let i = 0; i < ring.count; i++) {
      spawn({
        ...blank,
        kind: "ring",
        x,
        y,
        life: ring.life,
        // Each ring a little smaller, its arc facing its own way.
        angle: facing + (i ? (Math.random() * 2 - 1) * ring.offset : 0),
        size: i ? ring.inner : 1,
      });
    }

    // Spread round the circle, but not so evenly that it looks placed.
    const { tap: burst } = CONFIG.shard;
    const offset = Math.random() * TAU;
    for (let i = 0; i < burst.count; i++) {
      const angle =
        offset + ((i + (Math.random() - 0.5) * 0.6) / burst.count) * TAU;
      const r = within(burst.radius);
      spawnShard(
        x + Math.cos(angle) * r,
        y + Math.sin(angle) * r,
        angle,
        burst
      );
    }
  };

  const drag = (trail: Trail, x: number, y: number) => {
    const last = trail.points[trail.points.length - 1];
    // Held still long enough, every point has expired: start afresh here.
    if (!last) {
      trail.points.push({ x, y, born: now() });
      return;
    }
    const step = Math.hypot(x - last.x, y - last.y);
    if (step < CONFIG.trail.minStep) return;
    trail.points.push({ x, y, born: now() });

    const { drag: scatter } = CONFIG.shard;
    trail.sinceShard += step;
    while (trail.sinceShard >= scatter.every) {
      trail.sinceShard -= scatter.every;
      // Anywhere in the circle round the pointer, drifting away from it.
      const angle = Math.random() * TAU;
      const [inner, outer] = scatter.radius;
      const r = inner + (outer - inner) * Math.sqrt(Math.random());
      spawnShard(
        x + Math.cos(angle) * r,
        y + Math.sin(angle) * r,
        angle,
        scatter
      );
    }
  };

  const drawFlash = (p: Particle, t: number) => {
    const { flash } = CONFIG;
    const radius = (flash.size / 2) * interpolate(flash.scale, t);
    const color = mix(flash.colorStart, flash.color, t / flash.colorBy);
    const alpha = fadeOut(t, flash.fadeFrom);
    // The glow is part of the same gradient: a shadow would paint a second
    // disc underneath, and added together the blue would wash out to cyan.
    const outer = radius + flash.glow;
    const edge = radius / outer;

    const fill = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, outer);
    fill.addColorStop(0, `rgba(${color},${alpha})`);
    fill.addColorStop(edge * (1 - flash.softEdge), `rgba(${color},${alpha})`);
    fill.addColorStop(edge, `rgba(${color},${alpha * 0.3})`);
    fill.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(p.x, p.y, outer, 0, TAU);
    ctx.fill();
  };

  const drawRing = (p: Particle, t: number) => {
    const { ring } = CONFIG;
    const radius = ring.size * p.size * interpolate(ring.scale, t);
    // Ease-out: the speed falls steadily from `spin` to 0 over its life.
    const spun = ((ring.spin * Math.PI) / 180) * p.life * (t - (t * t) / 2);
    const shift = (t - ring.colorFrom) / (ring.colorBy - ring.colorFrom);
    const tint = mix(ring.colorStart, ring.color, shift);
    // The start colour is white, so a smaller shift is a whiter core.
    const core = mix(ring.colorStart, ring.color, shift * (1 - ring.coreWhite));
    const alpha = fadeOut(t, ring.fadeFrom);
    const sweep = interpolate(ring.arc, t) * TAU;
    // The arc is centred on its angle, which turns anticlockwise.
    const start = p.angle - spun - sweep / 2;

    /** One stretch of the arc, from `a` to `b` (shares of the sweep). */
    const piece = (a: number, b: number, opacity: number) => {
      const from = start + a * sweep;
      const to = start + b * sweep;
      for (const [extra, glowAlpha] of ring.glow) {
        ctx.lineWidth = ring.stroke + extra;
        ctx.strokeStyle = `rgba(${tint},${opacity * glowAlpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, from, to);
        ctx.stroke();
      }
      ctx.lineWidth = ring.stroke;
      ctx.strokeStyle = `rgba(${core},${opacity})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, from, to);
      ctx.stroke();
    };

    ctx.lineCap = "butt";
    // The middle in one go; only the ends, fading in and out, in pieces.
    piece(ring.taper, 1 - ring.taper, alpha);
    const step = ring.taper / TAPER_PIECES;
    for (let i = 0; i < TAPER_PIECES; i++) {
      const fade = alpha * ((i + 0.5) / TAPER_PIECES);
      piece(i * step, (i + 1) * step, fade);
      piece(1 - (i + 1) * step, 1 - i * step, fade);
    }
  };

  const drawShard = (p: Particle, t: number, age: number) => {
    const { shard } = CONFIG;
    const alpha = shardAlpha(t, p.phase);
    const size = p.size * interpolate(shard.scale, t);
    if (size <= 0 || alpha <= 0) return;

    const color = t < shard.colorFrom ? shard.colorStart : shard.color;
    const travelled = p.speed * age;
    const x = p.x + Math.cos(p.angle) * travelled;
    const y = p.y + Math.sin(p.angle) * travelled;
    // Equilateral, centred on its middle, pointing straight up or down.
    const h = (size * Math.sqrt(3)) / 2;
    const tip = p.flip ? h / 2 : -h / 2;

    ctx.fillStyle = `rgba(${channels(color).join(",")},${alpha})`;
    ctx.beginPath();
    ctx.moveTo(x, y + tip);
    ctx.lineTo(x + size / 2, y - tip);
    ctx.lineTo(x - size / 2, y - tip);
    ctx.closePath();
    ctx.fill();
  };

  /**
   * Fills a ribbon along `line` (head first), `width` wide at the head and
   * tapering to nothing at the tail. One shape rather than a stroke per
   * segment, so no seams show where segments meet.
   */
  const ribbon = (line: Point[], along: number[], width: number) => {
    const left: [number, number][] = [];
    const right: [number, number][] = [];
    line.forEach((pt, i) => {
      const prev = line[Math.max(i - 1, 0)];
      const next = line[Math.min(i + 1, line.length - 1)];
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      const length = Math.hypot(dx, dy) || 1;
      const half = (width / 2) * (1 - along[i]);
      const nx = (-dy / length) * half;
      const ny = (dx / length) * half;
      left.push([pt.x + nx, pt.y + ny]);
      right.push([pt.x - nx, pt.y - ny]);
    });
    ctx.beginPath();
    [...left, ...right.reverse()].forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.closePath();
    ctx.fill();
  };

  /** Draws a trail and drops its expired points; false once it is empty. */
  const drawTrail = (trail: Trail, time: number) => {
    const style = CONFIG.trail;
    trail.points = trail.points.filter((pt) => time - pt.born < style.life);
    if (trail.points.length < 2) return trail.points.length > 0;

    // Everything runs along the line, so measure it from the head back.
    const line = [...trail.points].reverse();
    const lengths = [0];
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1];
      const b = line[i];
      lengths.push(lengths[i - 1] + Math.hypot(a.x - b.x, a.y - b.y));
    }
    const total = lengths[lengths.length - 1];
    if (total < 1) return true;
    const along = lengths.map((l) => l / total);
    const head = line[0];
    const tail = line[line.length - 1];
    // The head's glow fades as its point ages, so a still pointer dims.
    const fresh = 1 - (time - head.born) / style.life;

    const { halo } = style;
    const haloColor = channels(halo.color).join(",");
    const haze = ctx.createRadialGradient(
      head.x,
      head.y,
      0,
      head.x,
      head.y,
      halo.radius
    );
    haze.addColorStop(0, `rgba(${haloColor},${halo.alpha * fresh})`);
    haze.addColorStop(1, `rgba(${haloColor},0)`);
    ctx.fillStyle = haze;
    ctx.beginPath();
    ctx.arc(head.x, head.y, halo.radius, 0, TAU);
    ctx.fill();

    // Colour by distance along the line, laid out from the head to the tail.
    const glow = ctx.createLinearGradient(head.x, head.y, tail.x, tail.y);
    style.colors.forEach(([at, color]) =>
      glow.addColorStop(at, `rgb(${channels(color).join(",")})`)
    );
    ctx.fillStyle = glow;
    for (const [extra, glowAlpha] of style.glow) {
      ctx.globalAlpha = glowAlpha;
      ribbon(line, along, style.width + extra);
    }
    ctx.globalAlpha = 1;
    ribbon(line, along, style.width);

    // A brighter core over it, fading out before the glow does.
    const coreColor = channels(style.core).join(",");
    const core = ctx.createLinearGradient(head.x, head.y, tail.x, tail.y);
    core.addColorStop(0, `rgba(${coreColor},1)`);
    core.addColorStop(style.coreLength, `rgba(${coreColor},0)`);
    ctx.fillStyle = core;
    ribbon(line, along, style.width * 0.75);
    return true;
  };

  const render = () => {
    frame = 0;
    const time = now();
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "lighter";
    let alive = false;

    active.forEach((trail) => {
      if (drawTrail(trail, time)) alive = true;
    });
    for (let i = fading.length - 1; i >= 0; i--) {
      if (drawTrail(fading[i], time)) alive = true;
      else fading.splice(i, 1);
    }

    for (const p of pool) {
      if (!p.alive) continue;
      const age = time - p.born;
      const t = age / p.life;
      if (t >= 1) {
        p.alive = false;
        continue;
      }
      alive = true;
      if (p.kind === "flash") drawFlash(p, t);
      else if (p.kind === "ring") drawRing(p, t);
      else drawShard(p, t, age);
    }

    // Nothing left: sleep until the next pointer event.
    if (alive) frame = requestAnimationFrame(render);
  };

  const wake = () => {
    if (!frame) frame = requestAnimationFrame(render);
  };

  const release = (id: number) => {
    const trail = active.get(id);
    if (!trail) return;
    active.delete(id);
    fading.push(trail);
  };

  const onDown = (e: PointerEvent) => {
    tap(e.clientX, e.clientY);
    release(e.pointerId);
    active.set(e.pointerId, {
      points: [{ x: e.clientX, y: e.clientY, born: now() }],
      sinceShard: 0,
    });
    wake();
  };

  const onMove = (e: PointerEvent) => {
    const trail = active.get(e.pointerId);
    if (!trail) return;
    drag(trail, e.clientX, e.clientY);
    wake();
  };

  const onUp = (e: PointerEvent) => release(e.pointerId);

  const onBlur = () => [...active.keys()].forEach(release);

  resize();
  const options = { capture: true, passive: true };
  window.addEventListener("resize", resize);
  window.addEventListener("pointerdown", onDown, options);
  window.addEventListener("pointermove", onMove, options);
  window.addEventListener("pointerup", onUp, options);
  window.addEventListener("pointercancel", onUp, options);
  window.addEventListener("blur", onBlur);

  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", resize);
    window.removeEventListener("pointerdown", onDown, options);
    window.removeEventListener("pointermove", onMove, options);
    window.removeEventListener("pointerup", onUp, options);
    window.removeEventListener("pointercancel", onUp, options);
    window.removeEventListener("blur", onBlur);
    canvas.remove();
  };
}
