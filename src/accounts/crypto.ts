/**
 * The accounts Worker's small pieces of cryptography, all from WebCrypto:
 * random ids and secrets, hashes of the secrets kept in D1, and signed
 * values (HMAC-SHA-256) for what travels through the browser and must come
 * back unchanged: a sign-in's `state` and a link ticket.
 */

const BASE32 = "abcdefghijklmnopqrstuvwxyz234567";

/** Random bytes as lower-case base32, no padding. */
export function randomBase32(bytes: number): string {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of data) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

/** An account's id: 128 random bits, never a running number. */
export const newAccountId = () => randomBase32(16);
/** What other players see of an account: 80 random bits, apart from its id. */
export const newPublicId = () => randomBase32(10);
/** A session token or one-time sign-in code: 256 random bits. */
export const newSecret = () => randomBase32(32);

/** A secret's SHA-256, as hex: what D1 keeps in its place. */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  try {
    const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * A value signed with the Worker's secret: its JSON and the signature, each
 * base64url, joined by a dot. Readable by anyone, changeable by no one.
 * `kind` keeps one sort of signed value from passing for another.
 */
export async function signValue(
  kind: string,
  value: object,
  secret: string
): Promise<string> {
  const body = toBase64Url(new TextEncoder().encode(JSON.stringify(value)));
  const signature = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(secret),
    new TextEncoder().encode(`${kind}.${body}`)
  );
  return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

/**
 * A signed value back, or null if it was changed, signed for another kind
 * or with another secret, or isn't one. The signature is checked by
 * WebCrypto, in constant time.
 */
export async function readSigned(
  kind: string,
  signed: string,
  secret: string
): Promise<Record<string, unknown> | null> {
  const [body, signature, extra] = signed.split(".");
  if (!body || !signature || extra !== undefined) return null;
  const bytes = fromBase64Url(signature);
  if (!bytes) return null;
  const good = await crypto.subtle.verify(
    "HMAC",
    await hmacKey(secret),
    bytes,
    new TextEncoder().encode(`${kind}.${body}`)
  );
  if (!good) return null;
  const json = fromBase64Url(body);
  if (!json) return null;
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(json));
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** The payload of a JSON Web Token, unchecked: see google in providers.ts. */
export function jwtPayload(token: string): Record<string, unknown> | null {
  const part = token.split(".")[1];
  const bytes = part ? fromBase64Url(part) : null;
  if (!bytes) return null;
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
