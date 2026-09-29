import React from "react";

import { GlobalNow, nowUrl, parseNow } from "../helpers/globalNow";

/**
 * What is on in Global, read once each time the hub shows, from the Worker
 * (the browser keeps it for fifteen minutes). Null until it comes, and if
 * it doesn't: the panel is a nicety, so it just stays away. No R2 backup,
 * so a Worker outage can't run up R2 reads for it.
 */
export function useGlobalNow(): GlobalNow | null {
  const [data, setData] = React.useState<GlobalNow | null>(null);

  React.useEffect(() => {
    let live = true;
    fetch(nowUrl())
      .then((response) => (response.ok ? response.json() : null))
      .then((json: unknown) => {
        if (live) setData(parseNow(json));
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  return data;
}
