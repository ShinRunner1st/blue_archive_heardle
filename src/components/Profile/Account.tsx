import React from "react";
import { IoLogoDiscord, IoLogoGoogle } from "react-icons/io5";

import {
  backupBeforeAccount,
  clearLocalProgress,
  forgetAccountProgress,
  lastProgressSync,
  saveBeforeSignOut,
} from "../../helpers/progressSync";
import { downloadText, reloadPage, saveFileName } from "../../helpers/saveFile";
import {
  AccountsUnavailable,
  fetchAccount,
  finishSignIn,
  SignInNotice,
  signOut,
  startSignIn,
  unlinkProvider,
} from "../../helpers/accountClient";
import { syncProfile } from "../../helpers/profileSync";
import {
  AccountView,
  AuthError,
  Provider,
  PROVIDER_NAMES,
  PROVIDERS,
} from "../../types/account";

import * as Styled from "./index.styled";

const ICONS: Record<Provider, React.ComponentType> = {
  google: IoLogoGoogle,
  discord: IoLogoDiscord,
};

/** What a sync that couldn't happen means for the player. */
const PROBLEMS: Record<"backupFailed" | "newerFormat" | "tooBig", string> = {
  backupFailed:
    "This browser's progress couldn't be copied aside first, so it hasn't been joined with your account yet. Free some space, or download a save file, then reload.",
  newerFormat:
    "Your account has progress from a newer version of the game. Reload the page to bring it in.",
  tooBig:
    "Your progress is too big to keep in your account. It's safe in this browser.",
};

const ERRORS: Record<AuthError, string> = {
  cancelled: "Sign-in was cancelled.",
  taken:
    "That account is already linked to another account here. Sign in with it to use that one.",
  has: "This account already has one from there linked.",
  expired: "That sign-in took too long. Please try again.",
  unavailable: "Signing in with that isn't set up yet.",
  slow: "Too many sign-ins from here just now. Wait a minute, then try again.",
  failed: "Couldn't sign in. Please try again.",
};

function noticeText(notice: SignInNotice): string {
  // The panel says so itself.
  if (notice.kind === "signedIn") return "";
  if (notice.kind === "linked") {
    return `${
      PROVIDER_NAMES[notice.provider]
    } is linked: either one signs you in.`;
  }
  return ERRORS[notice.error];
}

type State =
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "signedIn"; view: AccountView }
  | { status: "unreachable" };

const date = (ms: number) =>
  new Date(ms).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/**
 * The profile's Account tab (docs/accounts.md, step 1): sign in with
 * Google or Discord, link the other, unlink one, sign out. Only where
 * accounts are on, the dev server and the site's preview, until their
 * release; nothing is kept in an account yet. A sign-in that just came back
 * is finished here, as the profile opens on this tab by itself.
 */
export function AccountPanel() {
  const [state, setState] = React.useState<State>({ status: "loading" });
  const [notice, setNotice] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  // Signing out: the newest progress saving to the account, then the choice.
  const [leaving, setLeaving] = React.useState<
    "saving" | "saved" | "unsaved" | null
  >(null);
  const backup = backupBeforeAccount();
  const result = lastProgressSync();
  const problem =
    result === "backupFailed" || result === "newerFormat" || result === "tooBig"
      ? result
      : null;

  /** Signs out, keeping this browser's progress or clearing it. */
  const leave = (clear: boolean) =>
    act(async () => {
      forgetAccountProgress();
      if (clear) clearLocalProgress();
      await signOut();
      setLeaving(null);
      if (clear) {
        reloadPage();
        return;
      }
      setNotice("Signed out. This browser keeps its progress.");
      await load();
    });

  const load = React.useCallback(async () => {
    try {
      const view = await fetchAccount();
      setState(view ? { status: "signedIn", view } : { status: "signedOut" });
    } catch {
      setState({ status: "unreachable" });
    }
  }, []);

  React.useEffect(() => {
    let live = true;
    (async () => {
      const returned = await finishSignIn().catch(
        (): SignInNotice => ({ kind: "error", error: "failed" })
      );
      if (live && returned) setNotice(noticeText(returned));
      // Just signed in: the profile meets the account's (step 2).
      if (returned?.kind === "signedIn") {
        await syncProfile().catch(() => {});
      }
      if (live) await load();
    })();
    return () => {
      live = false;
    };
  }, [load]);

  const act = async (job: () => Promise<void>) => {
    setBusy(true);
    try {
      await job();
    } catch (error) {
      setNotice(
        error instanceof AccountsUnavailable
          ? "Couldn't reach accounts just now. Please try again."
          : ERRORS.failed
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Styled.AccountPanel>
      <Styled.Note as="p" role="status" aria-live="polite">
        {notice}
      </Styled.Note>

      {state.status === "loading" && <Styled.Note>Loading…</Styled.Note>}

      {state.status === "unreachable" && (
        <Styled.Note>
          Couldn&apos;t reach accounts just now. Your progress is safe in this
          browser.
        </Styled.Note>
      )}

      {state.status === "signedOut" && (
        <>
          <Styled.AccountLead>
            Sign in with Google or Discord to keep your profile with an account.
          </Styled.AccountLead>
          <Styled.AccountButtons>
            {PROVIDERS.map((provider) => {
              const Icon = ICONS[provider];
              return (
                <Styled.AccountButton
                  key={provider}
                  type="button"
                  disabled={busy}
                  onClick={() => act(() => startSignIn(provider))}
                >
                  <Icon aria-hidden="true" />
                  Sign in with {PROVIDER_NAMES[provider]}
                </Styled.AccountButton>
              );
            })}
          </Styled.AccountButtons>
        </>
      )}

      {state.status === "signedIn" && (
        <>
          <Styled.AccountLead>
            Signed in, since {date(state.view.createdAt)}.
          </Styled.AccountLead>
          <Styled.AccountRows>
            {PROVIDERS.map((provider) => {
              const Icon = ICONS[provider];
              const linked = state.view.identities.find(
                (identity) => identity.provider === provider
              );
              const last = state.view.identities.length <= 1;
              return (
                <Styled.AccountRow key={provider}>
                  <Icon aria-hidden="true" />
                  <Styled.AccountProvider>
                    {PROVIDER_NAMES[provider]}
                    <span>
                      {linked
                        ? `Linked ${date(linked.linkedAt)}`
                        : "Not linked"}
                    </span>
                  </Styled.AccountProvider>
                  {linked ? (
                    <Styled.AccountButton
                      type="button"
                      disabled={busy || last}
                      title={
                        last
                          ? "Your only way in: link the other first"
                          : undefined
                      }
                      onClick={() =>
                        act(async () => {
                          if (!(await unlinkProvider(provider))) {
                            setNotice(
                              "That's your only way in: link another first."
                            );
                          }
                          await load();
                        })
                      }
                    >
                      Unlink
                    </Styled.AccountButton>
                  ) : (
                    <Styled.AccountButton
                      type="button"
                      disabled={busy}
                      onClick={() => act(() => startSignIn(provider, true))}
                    >
                      Link
                    </Styled.AccountButton>
                  )}
                </Styled.AccountRow>
              );
            })}
          </Styled.AccountRows>
          <Styled.AccountLead as="p">
            Your progress is kept with your account, and here as well, so it
            plays on offline.
          </Styled.AccountLead>
          {backup && (
            <Styled.AccountButtons>
              <Styled.AccountButton
                type="button"
                onClick={() => downloadText(saveFileName(), backup)}
              >
                Download this browser&apos;s progress from before signing in
              </Styled.AccountButton>
            </Styled.AccountButtons>
          )}
          {leaving ? (
            <Styled.AccountLeave role="group" aria-label="Sign out">
              <Styled.AccountLead as="p">
                {leaving === "saving"
                  ? "Saving your newest progress to your account…"
                  : leaving === "saved"
                  ? "Keep your progress in this browser too? It's in your account either way."
                  : "Couldn't save your newest progress to your account just now, so this browser keeps its copy."}
              </Styled.AccountLead>
              {leaving !== "saving" && (
                <Styled.AccountButtons>
                  <Styled.AccountButton
                    type="button"
                    disabled={busy}
                    onClick={() => leave(false)}
                  >
                    Keep it here and sign out
                  </Styled.AccountButton>
                  {leaving === "saved" && (
                    <Styled.AccountButton
                      type="button"
                      disabled={busy}
                      onClick={() => leave(true)}
                    >
                      Clear it from this browser
                    </Styled.AccountButton>
                  )}
                  <Styled.AccountButton
                    type="button"
                    disabled={busy}
                    onClick={() => setLeaving(null)}
                  >
                    Cancel
                  </Styled.AccountButton>
                </Styled.AccountButtons>
              )}
            </Styled.AccountLeave>
          ) : (
            <Styled.AccountButtons>
              <Styled.AccountButton
                type="button"
                disabled={busy}
                onClick={() => {
                  setLeaving("saving");
                  saveBeforeSignOut()
                    .catch(() => false)
                    .then((saved) => setLeaving(saved ? "saved" : "unsaved"));
                }}
              >
                Sign out
              </Styled.AccountButton>
            </Styled.AccountButtons>
          )}
        </>
      )}

      {problem && <Styled.Note role="alert">{PROBLEMS[problem]}</Styled.Note>}

      <Styled.Note>
        Testing only: accounts are on here, not on baheardle.com yet.
      </Styled.Note>
    </Styled.AccountPanel>
  );
}
