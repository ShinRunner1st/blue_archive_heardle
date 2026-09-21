import React from "react";

import { Button } from "../Button";
import { clearRounds } from "../../helpers/storage";

import * as Styled from "./index.styled";

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Last line of defence. The storage layer already repairs bad saves, but if
 * anything else throws during render this turns a blank page into something the
 * player can recover from without opening devtools to clear site data.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Deliberate: this is the one place a crash should reach the console.
    // eslint-disable-next-line no-console
    console.error("Unhandled error:", error, info.componentStack);
  }

  private reload = () => {
    window.location.reload();
  };

  private resetSave = () => {
    clearRounds();
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <Styled.Container>
        <h1>Something broke 💔</h1>
        <p>Sensei, the game hit an error it could not recover from.</p>
        <Styled.Detail>{error.message}</Styled.Detail>
        <Styled.Buttons>
          <Button variant="green" onClick={this.reload}>
            Reload
          </Button>
          <Button variant="red" onClick={this.resetSave}>
            Clear save and reload
          </Button>
        </Styled.Buttons>
      </Styled.Container>
    );
  }
}
