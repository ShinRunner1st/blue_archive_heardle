import React from "react";

import { getServer, subscribeServer } from "../helpers/server";
import { Server } from "../types/server";

/** The server the student games follow, re-rendering when it changes. */
export function useServer(): Server {
  return React.useSyncExternalStore(subscribeServer, getServer);
}
