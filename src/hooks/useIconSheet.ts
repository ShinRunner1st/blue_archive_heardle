import React from "react";

import { loadedIconSheet, loadIconSheet } from "../helpers/iconSheet";

/** An icon sheet's address once it has loaded, or null until then. */
export function useIconSheet(key: string): string | null {
  const [sheet, setSheet] = React.useState(() => loadedIconSheet(key));

  React.useEffect(() => {
    if (sheet) return;
    let live = true;
    loadIconSheet(key).then((src) => live && setSheet(src));
    return () => {
      live = false;
    };
  }, [key, sheet]);

  return sheet;
}
