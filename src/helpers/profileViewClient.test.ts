// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ACCOUNT_SESSION_KEY } from "../constants/game";
import { MemoryStorage } from "../test/memoryStorage";
import { fetchProfileView } from "./accountClient";

/*
 * The page's request for another player's profile (docs/room-profiles.md):
 * the room's ticket is all it sends. The session token is a credential and
 * goes nowhere it isn't needed, so not even a signed-in page sends it here.
 */

const realFetch = globalThis.fetch;
let sent: { url: string; headers: Headers; body: string }[];
let status: number;

beforeEach(() => {
  sent = [];
  status = 200;
  Object.defineProperty(globalThis, "localStorage", {
    value: new MemoryStorage(),
    configurable: true,
    writable: true,
  });
  localStorage.setItem(ACCOUNT_SESSION_KEY, "a".repeat(52));
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    sent.push({
      url: request.url,
      headers: request.headers,
      body: await request.text(),
    });
    return new Response(
      status === 200
        ? JSON.stringify({
            summary: null,
            verified: { since: null, dailies: {}, rooms: null },
          })
        : JSON.stringify({ error: "notFound" }),
      { status }
    );
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("fetchProfileView", () => {
  it("sends the ticket alone, never the session token", async () => {
    expect(await fetchProfileView("the.ticket")).toMatchObject({
      summary: null,
    });
    expect(sent).toHaveLength(1);
    expect(sent[0].url).toMatch(/\/profile-view$/);
    expect(sent[0].headers.get("Authorization")).toBeNull();
    expect(sent[0].body).toBe(JSON.stringify({ ticket: "the.ticket" }));
    expect(sent[0].url).not.toContain("ticket");
  });

  it("is null for a hidden or gone profile, and throws when unreachable", async () => {
    status = 404;
    expect(await fetchProfileView("t")).toBeNull();
    status = 503;
    await expect(fetchProfileView("t")).rejects.toThrow();
  });
});
