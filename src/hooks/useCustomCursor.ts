import React from "react";

import {
  getCustomCursor,
  subscribeCustomCursor,
} from "../helpers/customCursor";

/** Whether Blue Archive's cursor is on, re-rendering whenever it changes. */
export function useCustomCursor(): boolean {
  return React.useSyncExternalStore(subscribeCustomCursor, getCustomCursor);
}
