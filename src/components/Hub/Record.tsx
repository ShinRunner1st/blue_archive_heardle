import React from "react";
import { IoIdCard } from "react-icons/io5";

import { senseiStats } from "../../helpers/senseiStats";
import { useServer } from "../../hooks/useServer";

import * as Styled from "./index.styled";

/**
 * The player's record across every game, read from the saves when the hub
 * shows, as on the Sensei card, which it opens. A new player has none, so
 * there is nothing to show them yet.
 */
export function Record({ onSenseiCard }: { onSenseiCard: () => void }) {
  const server = useServer();
  const stats = React.useMemo(() => senseiStats(undefined, server), [server]);
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
        <Styled.PanelAction type="button" onClick={onSenseiCard}>
          <IoIdCard aria-hidden="true" />
          Sensei card
        </Styled.PanelAction>
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
