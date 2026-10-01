import React from "react";
import { IoCheckmarkCircle, IoGift } from "react-icons/io5";

import { MISSION_GROUPS, MissionGroup } from "../../constants/missions";
import { unlocksOf } from "../../helpers/cosmetics";
import { useMissionProgress } from "../../hooks/useMissions";
import { Button } from "../Button";
import { PopUp, PopUpMeta } from "../PopUp";

import * as Styled from "./index.styled";

interface Props {
  onClose: () => void;
}

/**
 * The missions, a tab for each game, like the game's own mission list: what
 * to do, how far along, and what clearing it unlocks. Read from the saves
 * as it opens, and again when one is cleared while it's open.
 */
export function MissionsPopUp({ onClose }: Props) {
  const all = useMissionProgress();
  // The missions there are to clear; the retired ones cleared come last,
  // under Retired, and count for nothing.
  const progress = all.filter(({ mission }) => !mission.retired);
  const cleared = progress.filter(({ done }) => done).length;
  // Opens on the first tab with something left to do.
  const [group, setGroup] = React.useState<MissionGroup>(
    () =>
      MISSION_GROUPS.find(({ id }) =>
        progress.some(({ mission, done }) => mission.group === id && !done)
      )?.id ?? "daily"
  );

  return (
    <PopUp
      title="Missions 📋"
      subtitle={
        cleared === progress.length
          ? "Every mission cleared. Well done, Sensei!"
          : `${cleared} of ${progress.length} cleared.`
      }
      onClose={onClose}
      actions={
        <Button variant="green" onClick={onClose}>
          Close
        </Button>
      }
    >
      <Styled.Tabs role="tablist" aria-label="Missions by game">
        {MISSION_GROUPS.map(({ id, name }) => {
          const own = progress.filter(({ mission }) => mission.group === id);
          const done = own.filter((item) => item.done).length;
          return (
            <Styled.Tab
              key={id}
              type="button"
              role="tab"
              aria-selected={group === id}
              $active={group === id}
              onClick={() => setGroup(id)}
            >
              {name}
              <Styled.TabCount $all={done === own.length}>
                {done}/{own.length}
              </Styled.TabCount>
            </Styled.Tab>
          );
        })}
      </Styled.Tabs>

      <Styled.List role="tabpanel">
        {all
          .filter(({ mission }) => mission.group === group)
          .sort(
            (a, b) => Number(!!a.mission.retired) - Number(!!b.mission.retired)
          )
          .map(({ mission, value, goal, done }, i, shown) => {
            const unlocks = unlocksOf(mission.id);
            const firstRetired =
              mission.retired && !shown[i - 1]?.mission.retired;
            return (
              <React.Fragment key={mission.id}>
                {firstRetired && <Styled.Retired>Retired</Styled.Retired>}
                <Styled.Mission $done={done}>
                  <Styled.Head>
                    <Styled.Title>{mission.title}</Styled.Title>
                    {done ? (
                      <Styled.Stamp>
                        <IoCheckmarkCircle aria-hidden="true" />
                        Cleared
                      </Styled.Stamp>
                    ) : (
                      goal > 1 && (
                        <Styled.Count>
                          {value} / {goal}
                        </Styled.Count>
                      )
                    )}
                  </Styled.Head>
                  <Styled.Text>{mission.text}</Styled.Text>
                  {goal > 1 && !done && (
                    <Styled.Track aria-hidden="true">
                      <Styled.Fill
                        style={{ width: `${(value / goal) * 100}%` }}
                      />
                    </Styled.Track>
                  )}
                  {unlocks.length > 0 && (
                    <Styled.Unlock $done={done}>
                      <IoGift aria-hidden="true" />
                      {done ? "Unlocked: " : "Unlocks "}
                      {unlocks.join(", ")}
                    </Styled.Unlock>
                  )}
                </Styled.Mission>
              </React.Fragment>
            );
          })}
      </Styled.List>

      <PopUpMeta>
        Missions are worked out from your rounds on this device and stay
        cleared, even after a reset. What they unlock is picked on the Sensei
        card and in Settings.
      </PopUpMeta>
    </PopUp>
  );
}
