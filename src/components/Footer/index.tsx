import { IoHeart, IoLogoGithub } from "react-icons/io5";

import * as Styled from "./index.styled";

export function Footer() {
  return (
    <Styled.Text>
      Made with <IoHeart aria-hidden="true" /> by{" "}
      <Styled.Link
        href="https://github.com/ShinRunner1st/ba_ost_guess"
        target="_blank"
        rel="noopener noreferrer"
      >
        <IoLogoGithub aria-hidden="true" />
        ShinRunner1st
      </Styled.Link>
    </Styled.Text>
  );
}
