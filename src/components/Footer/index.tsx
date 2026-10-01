import { IoCafe, IoHeart, IoShieldCheckmark } from "react-icons/io5";

import { KOFI_URL } from "../../constants/game";
import { PAGES } from "../../constants/pages";

import * as Styled from "./index.styled";

interface Props {
  /** Opens the privacy policy in place, as the game bar opens a page. */
  onPrivacy?: () => void;
}

export function Footer({ onPrivacy }: Props) {
  return (
    <Styled.Text>
      Made with <IoHeart aria-hidden="true" /> by ShinRunner1st ·{" "}
      <Styled.Link href={KOFI_URL} target="_blank" rel="noopener noreferrer">
        <IoCafe aria-hidden="true" />
        Support on Ko-fi
      </Styled.Link>{" "}
      ·{" "}
      <Styled.Link
        href={PAGES.privacy.path}
        onClick={(event) => {
          // A plain click stays on the page; a new tab opens as asked.
          if (!onPrivacy || event.metaKey || event.ctrlKey || event.shiftKey)
            return;
          event.preventDefault();
          onPrivacy();
        }}
      >
        <IoShieldCheckmark aria-hidden="true" />
        Privacy
      </Styled.Link>
    </Styled.Text>
  );
}
