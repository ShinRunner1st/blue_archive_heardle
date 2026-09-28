import React from "react";

/**
 * How long a load may take before the player owns up to it. A clip already
 * in the browser's cache loads well within this, so switching modes doesn't
 * flash a loading bar for a moment before the controls.
 */
export const SLOW_LOAD_MS = 400;

/**
 * Whether a load has been going on long enough to show that it's loading.
 * `session` names what is loading, so a new one starts the wait over.
 */
export function useSlowLoad(loading: boolean, session: string): boolean {
  const [slow, setSlow] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!loading) return;
    const timer = window.setTimeout(() => setSlow(session), SLOW_LOAD_MS);
    return () => window.clearTimeout(timer);
  }, [loading, session]);

  return loading && slow === session;
}
