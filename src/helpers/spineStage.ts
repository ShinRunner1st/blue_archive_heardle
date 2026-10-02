import * as spine from "@esotericsoftware/spine-webgl";

import { FRAME, SpineCharacter } from "../constants/characters";

/**
 * A Blue Archive character drawn with the Spine runtime, reacting to the
 * pointer like the game's memorial lobby: hold on her to make her look at
 * you, stroke her head to pat it, tap her to change her expression.
 *
 * Tracks, as in the game: 0 idle, 1 and 2 the _M and _A halves of a look or
 * pat, 3 the expression, 4 a blink.
 */
export interface Stage {
  /** Shows this character, loading her first if need be. */
  show(character: SpineCharacter): void;
  /** Fetches a character's files ahead of time, without showing her. */
  preload(character: SpineCharacter): void;
  /** Her expression when nobody is touching her. */
  setExpression(name: string): void;
  /** Called once a character is on screen. */
  onReady(listener: () => void): void;
  /**
   * What the sprite on screen has, for the admin tool's pickers: its
   * animations and bones; null before one is drawn.
   */
  inspect(): { animations: string[]; bones: string[] } | null;
  /**
   * Where a point in skeleton units is on the canvas, in CSS pixels from
   * its top left: the admin tool's guides for the eyes and the pat.
   */
  project(x: number, y: number): [number, number] | null;
  dispose(): void;
}

const IDLE = 0;
const MAIN = 1;
const ADD = 2;
const FACE = 3;
const BLINK = 4;

/** Drawn at most this often: an idle sway needs no more. */
const FRAME_SECONDS = 1 / 60;
/** A press shorter and stiller than this is a tap. */
const TAP_MS = 250;
const TAP_MOVE = 8;
/** How long a tapped expression stays before the round's comes back. */
const TAPPED_SECONDS = 3;
/** How quickly the head follows its target, per second. */
const FOLLOW = 11;
const LOOK_GAIN = 0.35;
const PAT_GAIN = 0.5;
const BLINK_EVERY: [number, number] = [3, 6];

/** A region's corners as two triangles. */
const QUAD = [0, 1, 2, 2, 3, 0];
/** Reused for every piece's corners in a hit test. */
const corners: number[] = [];

/** Whether (x, y) is inside the triangle at `i` in `triangles`. */
function inTriangle(
  x: number,
  y: number,
  vertices: number[],
  triangles: number[],
  i: number
): boolean {
  const ax = vertices[triangles[i] * 2];
  const ay = vertices[triangles[i] * 2 + 1];
  const bx = vertices[triangles[i + 1] * 2];
  const by = vertices[triangles[i + 1] * 2 + 1];
  const cx = vertices[triangles[i + 2] * 2];
  const cy = vertices[triangles[i + 2] * 2 + 1];
  const d1 = (x - bx) * (ay - by) - (ax - bx) * (y - by);
  const d2 = (x - cx) * (by - cy) - (bx - cx) * (y - cy);
  const d3 = (x - ax) * (cy - ay) - (cx - ax) * (y - ay);
  const negative = d1 < 0 || d2 < 0 || d3 < 0;
  const positive = d1 > 0 || d2 > 0 || d3 > 0;
  return !(negative && positive);
}

interface Loaded {
  character: SpineCharacter;
  skeleton: spine.Skeleton;
  state: spine.AnimationState;
  point: spine.Bone | null;
  eye: spine.Bone | null;
}

type Gesture =
  | { kind: "none" }
  /** Pressed, not yet a tap nor a hold. */
  | {
      kind: "pending";
      id: number;
      /** Where it went down: on screen, and in skeleton units. */
      x: number;
      y: number;
      skeletonX: number;
      at: number;
      onHead: boolean;
    }
  | { kind: "look"; id: number }
  | { kind: "pat"; id: number; startX: number };

export function createStage(canvas: HTMLCanvasElement): Stage {
  let current: Loaded | null = null;
  let wanted: SpineCharacter | null = null;
  let expression = "";
  /** A tapped expression and when it lapses, overriding `expression`. */
  let tapped: { name: string; until: number } | null = null;
  let lastTapped = "";
  let gesture: Gesture = { kind: "none" };
  let clock = 0;
  let sinceDrawn = 0;
  let nextBlink = 0;
  /**
   * After a pat, her own face waits until then: the pat-end animation closes
   * her eyes its own way, and cutting in on it left one eye half shut.
   */
  let faceHeldUntil = 0;
  /** A character just switched in, still to be drawn once. */
  let unseen = false;
  /** Where Touch_Point is pushed, and where it is heading. */
  const offset = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  /**
   * How much of that the eyes take, gliding like the offset: all of it for a
   * look, none for a pat. Moved with the head during a pat, her eyes slid
   * out from under her hair.
   */
  let eyeShare = 1;
  let eyeShareTarget = 1;
  const readyListeners: Array<() => void> = [];
  const skeletons = new Map<string, spine.SkeletonData>();

  const app: spine.SpineCanvasApp = {
    update: (_, delta) => update(delta),
    render: (c) => render(c),
    // A file that won't load leaves her hidden (she never reports ready);
    // the game plays on without her.
    error: () => {},
  };
  const spineCanvas = new spine.SpineCanvas(canvas, {
    pathPrefix: "/spine/",
    app,
    webglConfig: { alpha: true },
  });
  const assets = spineCanvas.assetManager;

  const loaded = (character: SpineCharacter) =>
    !!assets.get(character.skel) && !!assets.get(character.atlas);

  const load = (character: SpineCharacter) => {
    if (!assets.get(character.skel)) assets.loadBinary(character.skel);
    if (!assets.get(character.atlas)) assets.loadTextureAtlas(character.atlas);
  };

  const skeletonData = (character: SpineCharacter) => {
    // By her files, not her id: the admin tool previews one sprite after
    // another under one id, and each must be read from its own.
    const key = `${character.skel}|${character.atlas}`;
    let data = skeletons.get(key);
    if (!data) {
      const atlas = assets.require(character.atlas) as spine.TextureAtlas;
      data = new spine.SkeletonBinary(
        new spine.AtlasAttachmentLoader(atlas)
      ).readSkeletonData(assets.require(character.skel));
      skeletons.set(key, data);
    }
    return data;
  };

  const has = (name: string) => !!current?.skeleton.data.findAnimation(name);

  /** Plays the names that exist, in order, one per track from `first`. */
  const play = (names: string[], first: number, loop: boolean, mix?: number) =>
    names.forEach((name, i) => {
      if (!has(name)) return;
      const entry = current!.state.setAnimation(first + i, name, loop);
      if (mix !== undefined) entry.mixDuration = mix;
    });

  const setFace = (name: string) => {
    if (!current || !has(name)) return;
    // A blink still running would cover the new face's eyes.
    current.state.setEmptyAnimation(BLINK, 0);
    const entry = current.state.setAnimation(FACE, name, true);
    entry.mixDuration = 0.15;
  };

  const faceNow = () =>
    tapped && tapped.until > clock ? tapped.name : expression;

  /** Whether her own face may show: not mid-pat, nor straight after one. */
  const faceFree = () => gesture.kind !== "pat" && clock >= faceHeldUntil;

  const build = (character: SpineCharacter) => {
    const data = skeletonData(character);
    const skeleton = new spine.Skeleton(data);
    const state = new spine.AnimationState(new spine.AnimationStateData(data));
    state.data.defaultMix = 0.15;
    state.setAnimation(IDLE, character.idle, true);
    current = {
      character,
      skeleton,
      state,
      point: character.touch ? skeleton.findBone(character.touch.point) : null,
      eye: character.touch ? skeleton.findBone(character.touch.eye) : null,
    };
    gesture = { kind: "none" };
    faceHeldUntil = 0;
    offset.x = offset.y = target.x = target.y = 0;
    setFace(faceNow());
    unseen = true;
    readyListeners.forEach((listener) => listener());
  };

  // --- Pointer ------------------------------------------------------------

  /** The pointer in skeleton units. */
  const toSkeleton = (e: PointerEvent) => {
    const box = canvas.getBoundingClientRect();
    const v = new spine.Vector3(e.clientX - box.left, e.clientY - box.top, 0);
    spineCanvas.renderer.camera.screenToWorld(v, box.width, box.height);
    return v;
  };

  /** Whether (x, y) falls on a piece of her that is drawn. */
  const onSprite = (x: number, y: number) => {
    if (!current) return false;
    for (const slot of current.skeleton.drawOrder) {
      const attachment = slot.getAttachment();
      if (!slot.bone.active || slot.color.a === 0 || !attachment) continue;
      let triangles: number[];
      if (attachment instanceof spine.RegionAttachment) {
        attachment.computeWorldVertices(slot, corners, 0, 2);
        triangles = QUAD;
      } else if (attachment instanceof spine.MeshAttachment) {
        attachment.computeWorldVertices(
          slot,
          0,
          attachment.worldVerticesLength,
          corners,
          0,
          2
        );
        triangles = attachment.triangles;
      } else continue;
      for (let i = 0; i < triangles.length; i += 3) {
        if (inTriangle(x, y, corners, triangles, i)) return true;
      }
    }
    return false;
  };

  const onHead = (x: number, y: number) => {
    const touch = current?.character.touch;
    if (!touch) return false;
    const [cx, cy, radius] = touch.pat;
    return Math.hypot(x - cx, y - cy) <= radius;
  };

  const startHold = (kind: "look" | "pat", id: number, startX: number) => {
    const touch = current?.character.touch;
    if (!touch) return;
    if (kind === "pat") {
      // The pat's _A half is her happy face. It swaps in at once: faded in
      // over her own face, an eye of each showed through for a moment.
      current!.state.setEmptyAnimation(BLINK, 0);
      current!.state.setEmptyAnimation(FACE, 0);
      play(touch.stroke.loop, MAIN, true, 0);
    } else {
      play(touch.look.loop, MAIN, true);
    }
    gesture = kind === "look" ? { kind, id } : { kind, id, startX };
    eyeShareTarget = kind === "look" ? touch.lookEyes : 0;
    canvas.style.cursor = kind === "pat" ? "grabbing" : "";
  };

  const endHold = () => {
    if (gesture.kind !== "look" && gesture.kind !== "pat") return;
    const touch = current?.character.touch;
    if (touch) {
      const end = touch[gesture.kind === "pat" ? "stroke" : "look"].end;
      play(end, MAIN, false);
      current!.state.addEmptyAnimation(MAIN, 0.2, 0);
      current!.state.addEmptyAnimation(ADD, 0.2, 0);
      if (gesture.kind === "pat") {
        const longest = Math.max(
          0,
          ...end.map(
            (name) => current!.skeleton.data.findAnimation(name)?.duration ?? 0
          )
        );
        faceHeldUntil = clock + longest + 0.2;
      }
    }
    target.x = target.y = 0;
    gesture = { kind: "none" };
    canvas.style.cursor = "";
  };

  const tap = () => {
    const pool = current?.character.moods.tapped ?? [];
    const choices = pool.filter((name) => name !== lastTapped && has(name));
    if (!choices.length) return;
    lastTapped = choices[Math.floor(Math.random() * choices.length)];
    tapped = { name: lastTapped, until: clock + TAPPED_SECONDS };
    faceHeldUntil = 0;
    setFace(lastTapped);
  };

  const onDown = (e: PointerEvent) => {
    if (!current || gesture.kind !== "none") return;
    const p = toSkeleton(e);
    // The canvas is a rectangle; only she herself answers a press.
    if (!onSprite(p.x, p.y)) return;
    canvas.setPointerCapture(e.pointerId);
    gesture = {
      kind: "pending",
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      skeletonX: p.x,
      at: performance.now(),
      onHead: onHead(p.x, p.y),
    };
  };

  const onMove = (e: PointerEvent) => {
    const touch = current?.character.touch;
    const p = toSkeleton(e);

    if (gesture.kind === "none") return;
    if ("id" in gesture && gesture.id !== e.pointerId) return;

    if (gesture.kind === "pending") {
      const moved = Math.hypot(e.clientX - gesture.x, e.clientY - gesture.y);
      if (moved < TAP_MOVE) return;
      if (gesture.onHead) startHold("pat", e.pointerId, gesture.skeletonX);
      else startHold("look", e.pointerId, 0);
    }
    if (!touch) return;

    if (gesture.kind === "look") {
      let dx = (p.x - touch.pointSetup[0]) * LOOK_GAIN;
      let dy = (p.y - touch.pointSetup[1]) * LOOK_GAIN;
      const length = Math.hypot(dx, dy);
      if (length > touch.lookMax) {
        dx *= touch.lookMax / length;
        dy *= touch.lookMax / length;
      }
      target.x = dx;
      target.y = dy;
    } else if (gesture.kind === "pat") {
      const drag = (p.x - gesture.startX) * PAT_GAIN;
      target.x = Math.max(-touch.patMax, Math.min(touch.patMax, drag));
      // A little dip with each stroke.
      target.y = -Math.min(Math.abs(drag) * 0.15, 10);
    }
  };

  const onUp = (e: PointerEvent) => {
    if (!("id" in gesture) || gesture.id !== e.pointerId) return;
    if (gesture.kind === "pending") {
      const quick = performance.now() - gesture.at < TAP_MS;
      gesture = { kind: "none" };
      if (quick) tap();
      return;
    }
    endHold();
  };

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);

  // --- Frame ----------------------------------------------------------------

  const applyOffset = (bone: spine.Bone | null, share = 1) => {
    if (!bone?.parent || share <= 0) return;
    // The offset is in skeleton space; the bone moves in its parent's.
    const origin = bone.parent.worldToLocal(new spine.Vector2(0, 0));
    const moved = bone.parent.worldToLocal(
      new spine.Vector2(offset.x * share, offset.y * share)
    );
    bone.x += moved.x - origin.x;
    bone.y += moved.y - origin.y;
  };

  function update(delta: number) {
    // Switch once the wanted character's files are in.
    if (wanted && wanted !== current?.character && loaded(wanted)) {
      build(wanted);
    }
    if (!current) return;

    // A pending press held long enough, without moving, becomes a look or
    // a pat on the spot.
    if (
      gesture.kind === "pending" &&
      performance.now() - gesture.at >= TAP_MS &&
      current.character.touch
    ) {
      const id = gesture.id;
      if (gesture.onHead) startHold("pat", id, gesture.skeletonX);
      else startHold("look", id, 0);
    }

    sinceDrawn += delta;
  }

  function render(c: spine.SpineCanvas) {
    // Held off while the colour scheme switches, so its reveal runs smooth,
    // and drawn at most 60 times a second whatever the screen's rate.
    // Hidden on a narrow window: kept, with her files, but not drawn.
    if (!current || sinceDrawn < FRAME_SECONDS || !canvas.clientWidth) return;
    // A character switched in by the scheme change itself still gets drawn
    // once, so the reveal uncovers her rather than the one she replaced.
    const paused =
      document.documentElement.dataset.schemeSwitching !== undefined;
    if (paused && !unseen) return;
    unseen = false;
    const dt = Math.min(sinceDrawn, 0.1);
    sinceDrawn = 0;
    clock += dt;

    const { skeleton, state, point, eye, character } = current;

    if (tapped && tapped.until <= clock) {
      tapped = null;
      if (faceFree()) setFace(expression);
    }
    if (faceHeldUntil && clock >= faceHeldUntil) {
      faceHeldUntil = 0;
      setFace(faceNow());
    }
    if (character.blink && clock >= nextBlink) {
      if (
        nextBlink > 0 &&
        has(character.blink) &&
        gesture.kind !== "look" &&
        faceFree() &&
        character.blinkable.includes(faceNow())
      ) {
        state.setAnimation(BLINK, character.blink, false);
        state.addEmptyAnimation(BLINK, 0.05, 0);
      }
      nextBlink =
        clock +
        BLINK_EVERY[0] +
        Math.random() * (BLINK_EVERY[1] - BLINK_EVERY[0]);
    }

    // Glide towards the target rather than snapping to it.
    const k = 1 - Math.exp(-FOLLOW * dt);
    offset.x += (target.x - offset.x) * k;
    offset.y += (target.y - offset.y) * k;
    eyeShare += (eyeShareTarget - eyeShare) * k;

    // In this order, so offsets never build up from frame to frame.
    point?.setToSetupPose();
    eye?.setToSetupPose();
    state.update(dt);
    state.apply(skeleton);
    skeleton.update(dt);
    skeleton.updateWorldTransform(spine.Physics.update);
    if (Math.abs(offset.x) + Math.abs(offset.y) > 0.01) {
      applyOffset(point);
      applyOffset(eye, eyeShare);
      skeleton.updateWorldTransform(spine.Physics.update);
    }

    // Frame her: at one scale, centred across, her eyes a set way below the
    // top (see FRAME).
    const renderer = c.renderer;
    renderer.resize(spine.ResizeMode.Expand);
    const camera = renderer.camera;
    camera.zoom = Math.max(
      FRAME.width / camera.viewportWidth,
      FRAME.height / camera.viewportHeight
    );
    const viewHeight = camera.viewportHeight * camera.zoom;
    const above = Math.max(FRAME.aboveEyes, viewHeight - FRAME.belowEyes);
    camera.position.x = character.centerX;
    camera.position.y = character.eyes + above - viewHeight / 2;
    camera.update();

    c.clear(0, 0, 0, 0);
    renderer.begin();
    // The atlases are not premultiplied.
    renderer.drawSkeleton(skeleton, false);
    renderer.end();
  }

  return {
    show(character) {
      wanted = character;
      load(character);
    },
    preload(character) {
      load(character);
    },
    setExpression(name) {
      if (name === expression) return;
      expression = name;
      if (faceFree() && !(tapped && tapped.until > clock)) setFace(name);
    },
    onReady(listener) {
      readyListeners.push(listener);
    },
    inspect() {
      if (!current) return null;
      const { data } = current.skeleton;
      return {
        animations: data.animations.map(({ name }) => name),
        bones: data.bones.map(({ name }) => name),
      };
    },
    project(x, y) {
      if (!current || !canvas.clientWidth) return null;
      const box = canvas.getBoundingClientRect();
      const v = new spine.Vector3(x, y, 0);
      spineCanvas.renderer.camera.worldToScreen(v, box.width, box.height);
      return [v.x, box.height - v.y];
    },
    dispose() {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      spineCanvas.dispose();
      // The runtime's own clean-up throws on an atlas whose texture it has
      // already freed. Losing the context below frees the GPU memory anyway,
      // and turning her off must never take the game down with it.
      try {
        assets.dispose();
      } catch {
        // Freed with the context.
      }
      spineCanvas.gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
