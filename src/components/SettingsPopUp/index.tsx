import { IoNavigate } from "react-icons/io5";

import { setCustomCursor } from "../../helpers/customCursor";
import { useCustomCursor } from "../../hooks/useCustomCursor";
import { Button } from "../Button";
import {
  PopUp,
  PopUpActions,
  PopUpBody,
  PopUpCardBody,
  PopUpCardIcon,
  PopUpCardText,
  PopUpCardTitle,
} from "../PopUp";
import { Switch } from "../Switch";

import * as Styled from "./index.styled";

interface Props {
  onClose: () => void;
}

export function SettingsPopUp({ onClose }: Props) {
  const customCursor = useCustomCursor();

  return (
    <PopUp title="Settings" subtitle="Saved on this device." onClose={onClose}>
      <PopUpBody>
        <Styled.Setting
          type="button"
          role="switch"
          aria-checked={customCursor}
          onClick={() => setCustomCursor(!customCursor)}
        >
          <PopUpCardIcon>
            <IoNavigate aria-hidden="true" />
          </PopUpCardIcon>
          <PopUpCardBody>
            <PopUpCardTitle>Blue Archive cursor</PopUpCardTitle>
            <PopUpCardText>
              The game&apos;s cursor, with its flash on every click and trail
              when you drag. Turn it off to use your own cursor.
            </PopUpCardText>
          </PopUpCardBody>
          <Switch $on={customCursor} aria-hidden="true" />
        </Styled.Setting>
      </PopUpBody>

      <PopUpActions>
        <Button variant="green" onClick={onClose}>
          Done
        </Button>
      </PopUpActions>
    </PopUp>
  );
}
