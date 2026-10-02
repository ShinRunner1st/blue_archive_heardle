import { Button } from "../Button";
import {
  PopUp,
  PopUpBody,
  PopUpCard,
  PopUpCardBody,
  PopUpCardIcon,
  PopUpCardText,
  PopUpCardTitle,
  PopUpGroupLabel,
  PopUpSpacer,
} from "../PopUp";
import { NewsUpdate, SHOWN_UPDATES, WHATS_NEW } from "../../constants/whatsNew";

import * as Styled from "./index.styled";

interface Props {
  onClose: () => void;
  /** The updates to show, newest first: the game's, or the admin tool's draft. */
  updates?: NewsUpdate[];
}

/**
 * What has been added lately: the newest update, then the few before it for
 * anyone who missed them. Shown once after an update, and from the menu.
 */
export function WhatsNewPopUp({ onClose, updates: all = WHATS_NEW }: Props) {
  const updates = all.slice(0, SHOWN_UPDATES);

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
        {updates.map((update, index) => (
          <section key={update.id} aria-label={update.name}>
            {index > 0 && <PopUpSpacer />}
            <PopUpGroupLabel>
              {update.name}
              {index === 0 && <Styled.NewTag>New</Styled.NewTag>}
            </PopUpGroupLabel>
            {update.items.map(({ icon: Icon, title, text }) => (
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
          </section>
        ))}
      </PopUpBody>
    </PopUp>
  );
}
