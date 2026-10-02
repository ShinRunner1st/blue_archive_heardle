import styled from "styled-components";
import "@fontsource-variable/nunito-sans";

import { VerifiedEntry, useVerifiedEntry } from "../../helpers/verifiedPlay";
import { VerifiedDaily } from "../../helpers/verifiedDaily";

const isStudents = (daily: VerifiedDaily) =>
  daily.startsWith("gameplay") || daily.startsWith("lore");

/** How the server judged it: "won in 3", or not found. */
function outcomeText(entry: VerifiedEntry): string {
  const tries = entry.tries ?? 0;
  if (entry.outcome === "won") {
    return isStudents(entry.daily)
      ? `found in ${tries} ${tries === 1 ? "guess" : "guesses"}`
      : `won in ${tries} ${tries === 1 ? "try" : "tries"}`;
  }
  return isStudents(entry.daily) ? "not found" : "not won";
}

/** What the note says, or null for nothing to say. */
export function verifiedText(entry: VerifiedEntry): string | null {
  switch (entry.state) {
    case "starting":
    case "playing":
    case "finishing":
      return "Sending to your verified record…";
    case "verified":
      return `✓ Verified: ${outcomeText(entry)}${
        isStudents(entry.daily) && entry.timeVerified === false
          ? " (sent late, so its time isn't counted)"
          : ""
      }`;
    case "elsewhere":
      return `Already played verified on another device: ${outcomeText(entry)}`;
    case "personal":
      switch (entry.why) {
        case "day":
          return "Not verified: this device's date isn't your account's day";
        case "behind":
          return "Not verified: your account is on a later day already";
        case "offline":
          return "Not verified: your account couldn't be reached as it began";
        case "late":
          return "Not verified: it reached your account after its deadline";
        default:
          return "Not verified: your account didn't take this round";
      }
  }
}

const Note = styled.p<{ $verified: boolean }>`
  margin: 14px auto 0;
  max-width: 100%;

  font-family: "Nunito Sans Variable";
  font-size: 0.85rem;
  font-weight: 700;
  line-height: 1.3;
  text-align: center;
  opacity: ${({ $verified }) => ($verified ? 1 : 0.75)};
`;

/**
 * Under a daily's result, signed in: whether the server counted it as
 * verified, and if not, why. The result itself is the page's, as ever;
 * nothing shows for a guest, or a daily never sent.
 */
export function VerifiedNote({
  daily,
  day,
}: {
  daily: VerifiedDaily;
  day: number | undefined;
}) {
  const entry = useVerifiedEntry(daily, day);
  const text = entry ? verifiedText(entry) : null;
  if (!entry || !text) return null;
  return (
    <Note role="status" $verified={entry.state === "verified"}>
      {text}
    </Note>
  );
}
