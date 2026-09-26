import { IoCafe, IoHeart } from "react-icons/io5";

import { KOFI_URL } from "../../constants/game";

import * as Styled from "./index.styled";

export function Footer() {
  return (
    <Styled.Text>
      Made with <IoHeart aria-hidden="true" /> by ShinRunner1st ·{" "}
      <Styled.Link href={KOFI_URL} target="_blank" rel="noopener noreferrer">
        <IoCafe aria-hidden="true" />
        Support on Ko-fi
      </Styled.Link>
    </Styled.Text>
  );
}
