/**
 * Light scrambling for what a player shouldn't read at a glance: the saved
 * answer and the daily schedule. Not encryption - the key ships with the game -
 * just enough that DevTools doesn't show the answer in plain text.
 *
 * No imports: the build scripts load this file directly with Node.
 */
const KEY = new TextEncoder().encode("Shittim Chest");

function xor(bytes: Uint8Array): Uint8Array {
  return bytes.map((byte, i) => byte ^ KEY[i % KEY.length]);
}

export function obscure(text: string): string {
  let binary = "";
  for (const byte of xor(new TextEncoder().encode(text))) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/** The text back, or null for anything obscure didn't produce. */
export function reveal(encoded: string): string | null {
  try {
    const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(xor(bytes));
  } catch {
    return null;
  }
}
