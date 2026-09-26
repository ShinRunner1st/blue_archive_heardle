import * as spine from "@esotericsoftware/spine-webgl";

import { SpineCharacter } from "../constants/characters";

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
  /** Her expression when nobody is touching her. */
  setExpression(name: string): void;
  /** Called once a character is on screen. */
  onReady(listener: () => void): void;
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
  /** Where Touch_Point is pushed, and where it is heading. */
  const offset = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
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
    assets.isLoadingComplete() &&
    assets.get(character.skel) &&
    assets.get(character.atlas);

  const skeletonData = (character: SpineCharacter) => {
    let data = skeletons.get(character.id);
    if (!data) {
      const atlas = assets.require(character.atlas) as spine.TextureAtlas;
      data = new spine.SkeletonBinary(
        new spine.AtlasAttachmentLoader(atlas)
      ).readSkeletonData(assets.require(character.skel));
      skeletons.set(character.id, data);
    }
    return data;
  };

  const has = (name: string) => !!current?.skeleton.data.findAnimation(name);

  /** Plays the names that exist, in order, one per track from `first`. */
  const play = (names: string[], first: number, loop: boolean) =>
    names.forEach((name, i) => {
      if (has(name)) current!.state.setAnimation(first + i, name, loop);
    });

  const setFace = (name: string) => {
    if (!current || !has(name)) return;
    const entry = current.state.setAnimation(FACE, name, true);
    entry.mixDuration = 0.15;
  };

  const faceNow = () =>
    tapped && tapped.until > clock ? tapped.name : expression;

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
    offset.x = offset.y = target.x = target.y = 0;
    setFace(faceNow());
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

  const onHead = (x: number, y: number) => {
    const touch = current?.character.touch;
    if (!touch) return false;
    return Math.hypot(x - touch.head[0], y - touch.head[1]) <= touch.headRadius;
  };

  const startHold = (kind: "look" | "pat", id: number, startX: number) => {
    const touch = current?.character.touch;
    if (!touch) return;
    // The pat's _A half is her happy face, so the expression steps aside.
    if (kind === "pat") current!.state.setEmptyAnimation(FACE, 0.15);
    play(touch[kind].loop, MAIN, true);
    gesture = kind === "look" ? { kind, id } : { kind, id, startX };
    canvas.style.cursor = kind === "pat" ? "grabbing" : "";
  };

  const endHold = () => {
    if (gesture.kind !== "look" && gesture.kind !== "pat") return;
    const touch = current?.character.touch;
    if (touch) {
      play(touch[gesture.kind].end, MAIN, false);
      current!.state.addEmptyAnimation(MAIN, 0.2, 0);
      current!.state.addEmptyAnimation(ADD, 0.2, 0);
      if (gesture.kind === "pat") setFace(faceNow());
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
    setFace(lastTapped);
  };

  const onDown = (e: PointerEvent) => {
    if (!current || gesture.kind !== "none") return;
    const p = toSkeleton(e);
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

    if (gesture.kind === "none") {
      canvas.style.cursor = onHead(p.x, p.y) ? "grab" : "";
      return;
    }
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

  const applyOffset = (bone: spine.Bone | null) => {
    if (!bone?.parent) return;
    // The offset is in skeleton space; the bone moves in its parent's.
    const origin = bone.parent.worldToLocal(new spine.Vector2(0, 0));
    const moved = bone.parent.worldToLocal(
      new spine.Vector2(offset.x, offset.y)
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
    if (!current || sinceDrawn < FRAME_SECONDS) return;
    if (document.documentElement.dataset.schemeSwitching !== undefined) return;
    const dt = Math.min(sinceDrawn, 0.1);
    sinceDrawn = 0;
    clock += dt;

    const { skeleton, state, point, eye, character } = current;

    if (tapped && tapped.until <= clock) {
      tapped = null;
      if (gesture.kind !== "pat") setFace(expression);
    }
    if (character.blink && clock >= nextBlink) {
      if (nextBlink > 0 && has(character.blink)) {
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

    // In this order, so offsets never build up from frame to frame.
    point?.setToSetupPose();
    eye?.setToSetupPose();
    state.update(dt);
    state.apply(skeleton);
    skeleton.update(dt);
    skeleton.updateWorldTransform(spine.Physics.update);
    if (Math.abs(offset.x) + Math.abs(offset.y) > 0.01) {
      applyOffset(point);
      applyOffset(eye);
      skeleton.updateWorldTransform(spine.Physics.update);
    }

    // Frame the character: her box, centred and as large as it fits.
    const renderer = c.renderer;
    renderer.resize(spine.ResizeMode.Expand);
    const { frame } = character;
    const camera = renderer.camera;
    camera.position.x = frame.x + frame.width / 2;
    camera.position.y = frame.y + frame.height / 2;
    camera.zoom = Math.max(
      frame.width / camera.viewportWidth,
      frame.height / camera.viewportHeight
    );
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
      if (!assets.get(character.skel)) assets.loadBinary(character.skel);
      if (!assets.get(character.atlas)) {
        assets.loadTextureAtlas(character.atlas);
      }
    },
    setExpression(name) {
      if (name === expression) return;
      expression = name;
      if (gesture.kind !== "pat" && !(tapped && tapped.until > clock)) {
        setFace(name);
      }
    },
    onReady(listener) {
      readyListeners.push(listener);
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
