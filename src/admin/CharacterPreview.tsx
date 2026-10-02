/**
 * A character in the preview frame, drawn by the game's own Spine stage
 * where the game puts her, left of the play area, with guides over her:
 * her eye line and middle (framing), and where a pat lands. She answers
 * holds, pats and taps as in the game.
 */
import React from "react";
import styled from "styled-components";

import * as CharacterStyled from "../components/Character/index.styled";
import type { SpineCharacter } from "../constants/characters";
import type { Stage } from "../helpers/spineStage";
import type { CharacterInfo, PreviewView } from "./messages";

const WIDE = 1100;

const Page = styled.div`
  position: fixed;
  inset: 0;
  background: ${({ theme }) => theme.background1} center / cover no-repeat
    url(${({ theme }) => theme.backgroundImage});
`;

/** Where the game's header and play area sit, so she's framed as there. */
const Header = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 88px;
  background: rgba(0, 0, 0, 0.35);
`;

const PlayArea = styled.div`
  position: fixed;
  top: 108px;
  bottom: 40px;
  left: calc(50% - 300px);
  width: 600px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.3);
  border: 2px dashed rgba(255, 255, 255, 0.25);
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.7);
  font-family: "Nunito Sans Variable";
`;

const Guides = styled.canvas`
  position: fixed;
  top: 88px;
  bottom: 0;
  left: 0;
  width: calc(50vw - 316px);
  height: calc(100vh - 88px);
  z-index: 2;
  pointer-events: none;
`;

const Narrow = styled.p`
  position: fixed;
  inset: 40% 24px auto;
  color: white;
  text-align: center;
  font-family: "Nunito Sans Variable";
`;

/** The guides' colours: eyes gold, middle blue, pat pink. */
const EYES = "#FFD24D";
const MIDDLE = "#4DC3FF";
const PAT = "#FF6BA8";

export function CharacterPreview({
  view,
}: {
  view: Extract<PreviewView, { kind: "character" }>;
}) {
  const canvas = React.useRef<HTMLCanvasElement>(null);
  const guides = React.useRef<HTMLCanvasElement>(null);
  const stage = React.useRef<Stage | null>(null);
  // One object per sprite, its set-up changed in place: a new object would
  // make the stage build her again, and start her over, on every edit.
  const shown = React.useRef(new Map<string, SpineCharacter>());
  const latest = React.useRef(view);
  latest.current = view;
  const [ready, setReady] = React.useState(false);
  const wide = window.innerWidth >= WIDE;

  const character = () => {
    const { character: next } = latest.current;
    let kept = shown.current.get(next.skel);
    if (!kept) {
      kept = { ...next };
      shown.current.set(next.skel, kept);
    }
    return Object.assign(kept, next);
  };

  React.useEffect(() => {
    if (!wide) return;
    let made: Stage | null = null;
    let cancelled = false;
    import("../helpers/spineStage").then(({ createStage }) => {
      if (cancelled || !canvas.current) return;
      made = createStage(canvas.current);
      made.onReady(() => {
        setReady(true);
        const info = made?.inspect();
        if (!info) return;
        const message: CharacterInfo = {
          type: "admin-character-info",
          skel: latest.current.character.skel,
          ...info,
        };
        window.parent.postMessage(message, window.location.origin);
      });
      made.show(character());
      made.setExpression(latest.current.face);
      stage.current = made;
    });
    return () => {
      cancelled = true;
      made?.dispose();
      stage.current = null;
    };
    // The stage is made once; what it shows follows below.
  }, [wide]);

  React.useEffect(() => {
    stage.current?.show(character());
    stage.current?.setExpression(view.face);
  });

  // The guides, drawn each frame where the stage says her points are.
  React.useEffect(() => {
    if (!wide) return;
    let frame = 0;
    const draw = () => {
      frame = requestAnimationFrame(draw);
      const element = guides.current;
      const context = element?.getContext("2d");
      if (!element || !context) return;
      const width = element.clientWidth;
      const height = element.clientHeight;
      if (element.width !== width || element.height !== height) {
        element.width = width;
        element.height = height;
      }
      context.clearRect(0, 0, width, height);
      const { character: shownNow, guides: on } = latest.current;
      const project = (x: number, y: number) => stage.current?.project(x, y);
      if (!on) return;
      const eyes = project(shownNow.centerX, shownNow.eyes);
      if (!eyes) return;
      context.lineWidth = 2;
      context.setLineDash([8, 6]);
      context.strokeStyle = EYES;
      context.beginPath();
      context.moveTo(0, eyes[1]);
      context.lineTo(width, eyes[1]);
      context.stroke();
      context.strokeStyle = MIDDLE;
      context.beginPath();
      context.moveTo(eyes[0], 0);
      context.lineTo(eyes[0], height);
      context.stroke();
      context.setLineDash([]);
      const touch = shownNow.touch;
      if (touch) {
        const [x, y, r] = touch.pat;
        const centre = project(x, y);
        const edge = project(x + r, y);
        if (centre && edge) {
          context.strokeStyle = PAT;
          context.beginPath();
          context.arc(
            centre[0],
            centre[1],
            Math.abs(edge[0] - centre[0]),
            0,
            7
          );
          context.stroke();
        }
        const point = project(touch.pointSetup[0], touch.pointSetup[1]);
        if (point) {
          context.fillStyle = PAT;
          context.beginPath();
          context.arc(point[0], point[1], 5, 0, 7);
          context.fill();
        }
      }
      context.font = "bold 13px sans-serif";
      context.fillStyle = EYES;
      context.fillText("eyes", 8, eyes[1] - 6);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [wide]);

  if (!wide) {
    return (
      <>
        <Page />
        <Narrow>
          Characters show beside the game on windows 1100 px wide and over; a
          phone never loads them. Switch the preview to 1920×911.
        </Narrow>
      </>
    );
  }
  return (
    <>
      <Page />
      <Header />
      <PlayArea>The game</PlayArea>
      <CharacterStyled.Stage $ready={ready} $hidden={false}>
        <canvas ref={canvas} aria-label={view.character.name} />
      </CharacterStyled.Stage>
      <Guides ref={guides} aria-hidden="true" />
    </>
  );
}
