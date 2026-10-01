import React from "react";
import { IoPerson, IoRibbon } from "react-icons/io5";

import { ACTIVE_MISSIONS } from "../../constants/missions";
import { activeClearedCount } from "../../helpers/missions";
import { senseiStats } from "../../helpers/senseiStats";
import { useMissionsVersion } from "../../hooks/useMissions";
import { useServer } from "../../hooks/useServer";

import * as Styled from "./index.styled";

/**
 * The player's record across every game, read from the saves when the hub
 * shows, with the way to their profile and missions. A new player has
 * none, so there is nothing to show them yet.
 */
export function Record({
  onMissions,
  onProfile,
}: {
  onMissions: () => void;
  onProfile: () => void;
}) {
  const server = useServer();
  const stats = React.useMemo(() => senseiStats(undefined, server), [server]);
  // Read again once a mission is cleared, so the count is right.
  useMissionsVersion();
  const missions = activeClearedCount();
  if (stats.roundsPlayed === 0) return null;

  const tiles = [
    { value: stats.roundsPlayed, label: "Rounds played" },
    {
      value: `${stats.songsGuessed}/${stats.songsTotal}`,
      label: "Songs guessed",
    },
    {
      value: `${stats.studentsFound}/${stats.studentsTotal}`,
      label: "Students found",
    },
    { value: stats.bestDailyStreak, label: "Best daily streak" },
  ];

  return (
    <Styled.Panel $wide aria-labelledby="hub-record">
      <Styled.PanelHead>
        <Styled.PanelTitle id="hub-record">Your record</Styled.PanelTitle>
        <Styled.PanelActions>
          <Styled.PanelAction type="button" onClick={onProfile}>
            <IoPerson aria-hidden="true" />
            Profile
          </Styled.PanelAction>
          <Styled.PanelAction type="button" onClick={onMissions}>
            <IoRibbon aria-hidden="true" />
            Missions {missions}/{ACTIVE_MISSIONS.length}
          </Styled.PanelAction>
        </Styled.PanelActions>
      </Styled.PanelHead>
      <Styled.Tiles>
        {tiles.map(({ value, label }) => (
          <Styled.Tile key={label}>
            <Styled.TileValue>{value}</Styled.TileValue>
            <Styled.TileLabel>{label}</Styled.TileLabel>
          </Styled.Tile>
        ))}
      </Styled.Tiles>
    </Styled.Panel>
  );
}
