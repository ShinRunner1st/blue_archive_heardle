import React from "react";
import {
  IoBarChart,
  IoInformationCircle,
  IoGameController,
} from "react-icons/io5";

import * as Styled from "./index.styled";
import img from "../../image/BlueArchive-Heardle.png";

interface Props {
  openInfoPopUp: () => void;
  openStatsPopUp: () => void;
  openHowToPopUp: () => void;
}

export function Header({
  openInfoPopUp,
  openStatsPopUp,
  openHowToPopUp,
}: Props) {
  return (
    <Styled.Container>
      <Styled.Content>
        <div className="left-icons">
          <IoInformationCircle onClick={openInfoPopUp} size="1em" />
          <IoGameController onClick={openHowToPopUp} size="1em" />
        </div>

        <Styled.Title>
          <Styled.Logo src={img} alt="Blue Archive Heardle" />
          <Styled.Tagline as="h1">
            Guess the Blue Archive Song
          </Styled.Tagline>
        </Styled.Title>

        <div className="right-icon">
          <IoBarChart onClick={openStatsPopUp} size="1em" />
        </div>
      </Styled.Content>
    </Styled.Container>
  );
}
