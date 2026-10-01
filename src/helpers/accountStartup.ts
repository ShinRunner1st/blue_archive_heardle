import { fetchAccountState, finishSignIn } from "./accountClient";
import { syncProgress } from "./progressSync";

/**
 * As a signed-in page opens (or one a sign-in just came back to), before
 * it draws: the sign-in is finished, and the progress synced, so the
 * account's save can be taken in while the games haven't read theirs yet
 * (docs/accounts.md, step 3). `canApply` turns false once the page draws
 * anyway, after a few seconds, so a slow network never holds it up; the
 * sync then carries on, writing to the account only.
 */
export async function startAccount(canApply: () => boolean): Promise<void> {
  await finishSignIn().catch(() => null);
  const state = await fetchAccountState().catch(() => undefined);
  if (!state) return;
  await syncProgress({ canApply, state });
}
