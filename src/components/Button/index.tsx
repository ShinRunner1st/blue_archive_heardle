import React, { CSSProperties } from "react";

import * as Styled from "./index.styled";
import { theme } from "../../constants";

interface Props {
  style?: CSSProperties;
  variant?: keyof typeof theme;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  /**
   * Outlines the button like the search box and guess slots around it. Used
   * in the play field; pop-up buttons sit on their own panel and go without.
   */
  stroke?: boolean;
}

export function Button({
  onClick,
  style,
  variant,
  children,
  disabled,
  stroke,
}: Props) {
  return (
    <Styled.Button
      onClick={onClick}
      variant={variant}
      style={style}
      disabled={disabled}
      $stroke={stroke}
    >
      {children}
    </Styled.Button>
  );
}
