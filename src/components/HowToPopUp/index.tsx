import React from "react";
import { Button } from "..";

import * as Styled from "./index.styled";

interface Props {
  onClose: () => void;
}

export function HowToPopUp({ onClose }: Props) {
  return (
    <Styled.Container>
      <Styled.PopUp>
        <h2 style={{ margin: 0 }}>How To Guess❓</h2>
        <Styled.Spacer />
        <h3>Search for your OST and select your choice.</h3>
        <Styled.Spacer />
        <Styled.Text>
          You can search using the options below, <br />
          and your result will appear at the top.
        </Styled.Text>
        <Styled.TextB>● Search by Name</Styled.TextB>
        <Styled.TextB>● Search by Number of OSTs</Styled.TextB>
        <Styled.TextB>● Search by Artist</Styled.TextB>
        <Styled.Section>
          <Button variant="green" style={{ marginTop: 20 }} onClick={onClose}>
            Close
          </Button>
        </Styled.Section>
      </Styled.PopUp>
    </Styled.Container>
  );
}
