import React from "react";

import { GlobalNow, nowUrl, parseNowFile } from "../helpers/globalNow";
import { Server } from "../types/server";
import { useServer } from "./useServer";

/**
 * What is on in the server the student games follow, Global or JP, read
 * once each time the hub shows, from the Worker (the browser keeps it for
 * fifteen minutes); a switch of server changes it with no new request. Null
 * until it comes, and if it doesn't: the panel is a nicety, so it just stays
 * away. No R2 backup, so a Worker outage can't run up R2 reads for it.
 */
export function useGlobalNow(): GlobalNow | null {
  const server = useServer();
  const [data, setData] = React.useState<Record<
    Server,
    GlobalNow | null
  > | null>(null);

  React.useEffect(() => {
    let live = true;
    fetch(nowUrl())
      .then((response) => (response.ok ? response.json() : null))
      .then((json: unknown) => {
        if (live) setData(parseNowFile(json));
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  return data?.[server] ?? null;
}
