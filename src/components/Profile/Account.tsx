import React from "react";
import { IoLogoDiscord, IoLogoGoogle } from "react-icons/io5";

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
          <Styled.AccountButtons>
            <Styled.AccountButton
              type="button"
              disabled={busy}
              onClick={() =>
                act(async () => {
                  await signOut();
                  setNotice(
                    "Signed out. This browser's progress is as it was."
                  );
                  await load();
                })
              }
            >
              Sign out
            </Styled.AccountButton>
          </Styled.AccountButtons>
        </>
      )}

      <Styled.Note>
        Testing only: accounts are on here, not on baheardle.com yet, and
        nothing is kept in an account yet. Your progress stays in this browser.
      </Styled.Note>
    </Styled.AccountPanel>
  );
}
