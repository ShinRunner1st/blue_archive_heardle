import React from "react";

import { Season } from "../constants/seasons";
import { seasonOn } from "../helpers/season";

/**
 * The season today, checked again whenever the tab comes back, so one left
 * open over the first night of a season changes with the date.
 */
export function useSeason(): Season | null {
  const [season, setSeason] = React.useState(() => seasonOn());

  React.useEffect(() => {
    const check = () => setSeason(seasonOn());
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  return season;
}
