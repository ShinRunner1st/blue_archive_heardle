import { Button } from "../Button";
import {
  PopUp,
  PopUpBody,
  PopUpCard,
  PopUpCardBody,
  PopUpCardIcon,
  PopUpCardText,
  PopUpCardTitle,
} from "../PopUp";
import { WHATS_NEW } from "../../constants/whatsNew";

interface Props {
  onClose: () => void;
}

/** What has been added lately: shown once after an update, and from the menu. */
export function WhatsNewPopUp({ onClose }: Props) {
  return (
    <PopUp
      title="What's new ✨"
      subtitle="A few things have been added, Sensei."
      onClose={onClose}
      actions={
        <Button variant="green" onClick={onClose}>
          Let&apos;s play
        </Button>
      }
    >
      <PopUpBody>
        {WHATS_NEW.items.map(({ icon: Icon, title, text }) => (
          <PopUpCard key={title}>
            <PopUpCardIcon>
              <Icon aria-hidden="true" />
            </PopUpCardIcon>
            <PopUpCardBody>
              <PopUpCardTitle>{title}</PopUpCardTitle>
              <PopUpCardText>{text}</PopUpCardText>
            </PopUpCardBody>
          </PopUpCard>
        ))}
      </PopUpBody>
    </PopUp>
  );
}
