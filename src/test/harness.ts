import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { ThemeProvider } from "styled-components";

import { theme } from "../constants";

export interface Harness {
  container: HTMLDivElement;
  /** Render (or re-render) into the same root. */
  render(element: React.ReactElement): void;
  unmount(): void;
  /** Unmount and detach the container. */
  destroy(): void;
}

/**
 * Minimal render harness so every component test shares one place that knows
 * how this project mounts React. Wraps children in the ThemeProvider, since
 * every styled component reads from it.
 */
export function createHarness(): Harness {
  const container = document.createElement("div");
  document.body.appendChild(container);

  let root: Root | null = null;

  const harness: Harness = {
    container,

    render(element) {
      act(() => {
        if (!root) root = createRoot(container);
        root.render(React.createElement(ThemeProvider, { theme }, element));
      });
    },

    unmount() {
      if (!root) return;
      const current = root;
      root = null;
      act(() => current.unmount());
    },

    destroy() {
      harness.unmount();
      container.remove();
    },
  };

  return harness;
}
