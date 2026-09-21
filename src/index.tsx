import React from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "styled-components";

import { ErrorBoundary } from "./components";
import { theme } from "./constants";
import App from "./app";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing #root element");

createRoot(rootElement).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </ThemeProvider>
  </React.StrictMode>
);
