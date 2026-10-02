import React from "react";
import styled from "styled-components";

import type { ColorScheme } from "../constants/theme";
import type { PreviewMessage, PreviewView } from "./messages";
import { Heading, Row, Tab } from "./ui";

/**
 * The windows previews are checked at: the shortest desktop (a 1080p
 * screen less the browser's bars), a full 1080p one, and a phone.
 */
const DEVICES = {
  desktop: { width: 1920, height: 911, label: "1920×911" },
  full: { width: 1920, height: 1080, label: "1920×1080" },
  phone: { width: 390, height: 844, label: "Phone" },
} as const;
type Device = keyof typeof DEVICES;

/** A choice the tool remembers between visits, in this browser only. */
function useRemembered<T extends string>(
  key: string,
  start: T,
  allowed: readonly T[]
): [T, (value: T) => void] {
  const [value, setValue] = React.useState<T>(() => {
    try {
      const kept = localStorage.getItem(key) as T | null;
      return kept && allowed.includes(kept) ? kept : start;
    } catch {
      return start;
    }
  });
  const set = (next: T) => {
    setValue(next);
    try {
      localStorage.setItem(key, next);
    } catch {
      // Kept for this visit only.
    }
  };
  return [value, set];
}

const Pane = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 14px 16px;
`;

const Stage = styled.div<{ $scroll: boolean }>`
  flex: 1;
  min-height: 0;
  margin-top: 10px;
  overflow: ${({ $scroll }) => ($scroll ? "auto" : "hidden")};
`;

/** The scaled screen's room on the page, centred while it fits. */
const Sizer = styled.div`
  position: relative;
  margin: 0 auto;
`;

const Screen = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: top left;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.25), 0 8px 30px rgba(0, 0, 0, 0.5);

  iframe {
    display: block;
    border: none;
  }
`;

/**
 * The game's own components drawing the draft, in a frame the size of a
 * real window, scaled to fit: what's there is what players would see.
 */
export function PreviewPane({
  view,
  extra,
}: {
  view: PreviewView;
  /** Controls for this preview, such as a mission's progress. */
  extra?: React.ReactNode;
}) {
  const [device, setDevice] = useRemembered<Device>(
    "admin-preview-device",
    "desktop",
    Object.keys(DEVICES) as Device[]
  );
  const [scheme, setScheme] = useRemembered<ColorScheme>(
    "admin-preview-scheme",
    "light",
    ["light", "dark"]
  );
  const frame = React.useRef<HTMLIFrameElement>(null);
  const stage = React.useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useRemembered<"fit" | "full">(
    "admin-preview-zoom",
    "fit",
    ["fit", "full"]
  );
  const [fitScale, setFitScale] = React.useState(0.3);
  const size = DEVICES[device];
  const scale = zoom === "full" ? 1 : fitScale;

  React.useLayoutEffect(() => {
    const element = stage.current;
    if (!element) return;
    const fit = () =>
      setFitScale(
        Math.min(
          element.clientWidth / size.width,
          element.clientHeight / size.height,
          1
        )
      );
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => observer.disconnect();
  }, [size.width, size.height]);

  // At full size, the middle of the window in sight, where pop-ups open.
  React.useLayoutEffect(() => {
    const element = stage.current;
    if (element && zoom === "full") {
      element.scrollLeft = (element.scrollWidth - element.clientWidth) / 2;
      element.scrollTop = 0;
    }
  }, [zoom, device]);

  const message: PreviewMessage = { type: "admin-preview", scheme, view };
  const latest = React.useRef(message);
  latest.current = message;
  const post = React.useCallback(() => {
    frame.current?.contentWindow?.postMessage(
      latest.current,
      window.location.origin
    );
  }, []);

  // Sent on every change, and again when the frame says it's ready (after
  // its first load, or a reload when the game's code changes).
  React.useEffect(post, [post, scheme, view]);
  React.useEffect(() => {
    const ready = (event: MessageEvent) => {
      if (
        event.origin === window.location.origin &&
        event.source === frame.current?.contentWindow &&
        event.data?.type === "admin-preview-ready"
      ) {
        post();
      }
    };
    window.addEventListener("message", ready);
    return () => window.removeEventListener("message", ready);
  }, [post]);

  return (
    <Pane>
      <Heading>
        Preview
        <Row>
          {(Object.keys(DEVICES) as Device[]).map((id) => (
            <Tab
              key={id}
              type="button"
              $active={device === id}
              onClick={() => setDevice(id)}
            >
              {DEVICES[id].label}
            </Tab>
          ))}
          <Tab
            type="button"
            $active={false}
            onClick={() => setScheme(scheme === "light" ? "dark" : "light")}
          >
            {scheme === "light" ? "☀ Day" : "☾ Night"}
          </Tab>
          <Tab
            type="button"
            $active={zoom === "full"}
            title="Fit the window in the pane, or show it at its real size"
            onClick={() => setZoom(zoom === "fit" ? "full" : "fit")}
          >
            {zoom === "fit" ? "Fit" : "100%"}
          </Tab>
        </Row>
      </Heading>
      {extra}
      <Stage ref={stage} $scroll={zoom === "full"}>
        <Sizer
          style={{ width: size.width * scale, height: size.height * scale }}
        >
          <Screen
            style={{
              width: size.width,
              height: size.height,
              transform: `scale(${scale})`,
            }}
          >
            <iframe
              ref={frame}
              title="Preview"
              src="/preview.html"
              width={size.width}
              height={size.height}
            />
          </Screen>
        </Sizer>
      </Stage>
    </Pane>
  );
}
