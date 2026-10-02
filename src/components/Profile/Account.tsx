import React from "react";
import { IoLogoDiscord, IoLogoGoogle, IoPeople } from "react-icons/io5";

import {
  clearLocalProgress,
  forgetAccountProgress,
  hasLocalProgress,
  lastProgressSync,
  saveBeforeSignOut,
} from "../../helpers/progressSync";
import { reloadPage } from "../../helpers/saveFile";
import { downloadAccountData } from "../../helpers/accountData";
import {
  AccountsUnavailable,
  deleteAccount,
  fetchAccount,
  finishSignIn,
  putProfileShown,
  SignInNotice,
  signOut,
  startSignIn,
  unlinkProvider,
} from "../../helpers/accountClient";
import { forgetMissionsSent, syncProfile } from "../../helpers/profileSync";
import { forgetRoomPass } from "../../helpers/roomPass";
import { PAGES } from "../../constants/pages";
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
const PROBLEMS: Record<"clearFailed" | "newerFormat" | "tooBig", string> = {
  clearFailed:
    "This browser's progress as a guest couldn't be cleared, so your account's isn't here yet. Reload the page to try again.",
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

/** The privacy policy, in a tab of its own, so this one stays as it is. */
function PolicyLink({ children }: { children: React.ReactNode }) {
  return (
    <Styled.AccountLink
      href={PAGES.privacy.path}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </Styled.AccountLink>
  );
}

/**
 * The profile's Account tab (docs/accounts.md): sign in with Google or
 * Discord, link the other, unlink one, sign out, download everything kept,
 * delete the account. Only where accounts are on (an accounts address in
 * the build). A sign-in that just came back is finished here, as the
 * profile opens on this tab by itself.
 */
export function AccountPanel() {
  const [state, setState] = React.useState<State>({ status: "loading" });
  const [notice, setNotice] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  // Signing in where this browser has a guest's progress: it goes first.
  const [joining, setJoining] = React.useState<Provider | null>(null);
  // Signing out: the newest progress saving to the account, then, if it
  // couldn't, whether to go anyway.
  const [leaving, setLeaving] = React.useState<"saving" | "unsaved" | null>(
    null
  );
  // Deleting the account: what goes, then are you sure.
  const [deleting, setDeleting] = React.useState<"ask" | "sure" | null>(null);
  const result = lastProgressSync();
  const problem =
    result === "clearFailed" || result === "newerFormat" || result === "tooBig"
      ? result
      : null;

  /** Signs in, after saying a guest's progress here goes, if there is any. */
  const signIn = (provider: Provider) => {
    if (joining === null && hasLocalProgress()) setJoining(provider);
    else void act(() => startSignIn(provider));
  };

  /**
   * Leaves this browser a new guest's (docs/plan.md, Guest limits): the
   * account's progress is cleared from it, and the page opens again.
   */
  const clearHere = () => {
    forgetAccountProgress();
    forgetMissionsSent();
    forgetRoomPass();
    clearLocalProgress();
  };

  /** Signs out, clearing this browser. */
  const leave = () =>
    act(async () => {
      clearHere();
      await signOut();
      reloadPage();
    });

  /** Saves the newest progress, then signs out; asks if it couldn't save. */
  const startLeaving = () => {
    setLeaving("saving");
    saveBeforeSignOut()
      .catch(() => false)
      .then((saved) => (saved ? leave() : setLeaving("unsaved")));
  };

  /** Deletes the account, and clears this browser. */
  const deleteIt = () =>
    act(async () => {
      await deleteAccount();
      clearHere();
      reloadPage();
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
            Sign in with Google or Discord to keep your progress and profile
            with an account, on every device, and open every mission and reward.
            It&apos;s optional: every game plays without one.
          </Styled.AccountLead>
          <Styled.Note>
            An account keeps your Google or Discord id (not your email or name),
            your profile, progress and missions, and nothing else.{" "}
            <PolicyLink>What&apos;s kept, and for how long</PolicyLink>
          </Styled.Note>
          {joining ? (
            <Styled.AccountLeave role="group" aria-label="Sign in">
              <Styled.AccountLead as="p">
                An account starts fresh: this browser&apos;s progress as a guest
                (your rounds, streaks and missions) is deleted as you sign in,
                not added to the account. If the account has progress, it comes
                here instead.
              </Styled.AccountLead>
              <Styled.AccountButtons>
                <Styled.AccountButton
                  type="button"
                  disabled={busy}
                  $danger
                  onClick={() => signIn(joining)}
                >
                  Delete it and sign in with {PROVIDER_NAMES[joining]}
                </Styled.AccountButton>
                <Styled.AccountButton
                  type="button"
                  disabled={busy}
                  onClick={() => setJoining(null)}
                >
                  Cancel
                </Styled.AccountButton>
              </Styled.AccountButtons>
            </Styled.AccountLeave>
          ) : (
            <Styled.AccountButtons>
              {PROVIDERS.map((provider) => {
                const Icon = ICONS[provider];
                return (
                  <Styled.AccountButton
                    key={provider}
                    type="button"
                    disabled={busy}
                    onClick={() => signIn(provider)}
                  >
                    <Icon aria-hidden="true" />
                    Sign in with {PROVIDER_NAMES[provider]}
                  </Styled.AccountButton>
                );
              })}
            </Styled.AccountButtons>
          )}
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
          <Styled.AccountRows>
            <Styled.AccountRow>
              <IoPeople aria-hidden="true" />
              <Styled.AccountProvider>
                Your profile in rooms
                <span>
                  {state.view.profileShown
                    ? "Players in a room with you can see it from your card"
                    : "Hidden: your card in a room opens nothing"}
                </span>
              </Styled.AccountProvider>
              <Styled.AccountButton
                type="button"
                disabled={busy}
                aria-pressed={!state.view.profileShown}
                onClick={() =>
                  act(async () => {
                    const shown = !state.view.profileShown;
                    if (await putProfileShown(shown)) {
                      // The next room gets a pass that says so.
                      forgetRoomPass();
                    }
                    await load();
                  })
                }
              >
                {state.view.profileShown ? "Hide" : "Show"}
              </Styled.AccountButton>
            </Styled.AccountRow>
          </Styled.AccountRows>
          <Styled.AccountLead as="p">
            Your progress is kept with your account, and here as well, so it
            plays on offline. Signing out clears it from this browser.
          </Styled.AccountLead>
          {deleting === "ask" || deleting === "sure" ? (
            <Styled.AccountLeave role="group" aria-label="Delete account">
              <Styled.AccountLead as="p">
                {deleting === "ask"
                  ? "Deleting your account deletes everything kept for it: your Google and Discord links, your profile, your progress and its backup, your missions, and every device's sign-in. This browser is cleared too, back to a new guest."
                  : "Are you sure? It can't be undone, and other devices are signed out too."}
              </Styled.AccountLead>
              <Styled.AccountButtons>
                <Styled.AccountButton
                  type="button"
                  disabled={busy}
                  $danger
                  onClick={() =>
                    deleting === "ask" ? setDeleting("sure") : deleteIt()
                  }
                >
                  {deleting === "ask"
                    ? "Delete my account"
                    : "Yes, delete it for good"}
                </Styled.AccountButton>
                <Styled.AccountButton
                  type="button"
                  disabled={busy}
                  onClick={() => setDeleting(null)}
                >
                  Cancel
                </Styled.AccountButton>
              </Styled.AccountButtons>
            </Styled.AccountLeave>
          ) : leaving ? (
            <Styled.AccountLeave role="group" aria-label="Sign out">
              <Styled.AccountLead as="p">
                {leaving === "saving"
                  ? "Saving your newest progress to your account, then signing out…"
                  : "Couldn't save your newest progress to your account just now. Signing out clears this browser, so what isn't saved yet would be lost."}
              </Styled.AccountLead>
              {leaving === "unsaved" && (
                <Styled.AccountButtons>
                  <Styled.AccountButton
                    type="button"
                    disabled={busy}
                    onClick={startLeaving}
                  >
                    Try again
                  </Styled.AccountButton>
                  <Styled.AccountButton
                    type="button"
                    disabled={busy}
                    $danger
                    onClick={leave}
                  >
                    Sign out anyway
                  </Styled.AccountButton>
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
                onClick={startLeaving}
              >
                Sign out
              </Styled.AccountButton>
              <Styled.AccountButton
                type="button"
                disabled={busy}
                onClick={() =>
                  act(async () => {
                    if (!(await downloadAccountData())) await load();
                  })
                }
              >
                Download my data
              </Styled.AccountButton>
              <Styled.AccountButton
                type="button"
                disabled={busy}
                onClick={() => setDeleting("ask")}
              >
                Delete account
              </Styled.AccountButton>
            </Styled.AccountButtons>
          )}
          <Styled.Note>
            Kept while you play; deleted after 2 years unused.{" "}
            <PolicyLink>Privacy</PolicyLink>
          </Styled.Note>
        </>
      )}

      {problem && <Styled.Note role="alert">{PROBLEMS[problem]}</Styled.Note>}
    </Styled.AccountPanel>
  );
}
