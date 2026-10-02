// @vitest-environment node
import { gzipSync } from "node:zlib";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchAccountData } from "./accountClient";
import { accountFileName, downloadAccountData } from "./accountData";
import { downloadBlob } from "./download";

vi.mock("./accountClient", () => ({ fetchAccountData: vi.fn() }));
vi.mock("./download", () => ({ downloadBlob: vi.fn() }));

const fetched = vi.mocked(fetchAccountData);
const saved = vi.mocked(downloadBlob);

const gzipped = (value: unknown) =>
  gzipSync(Buffer.from(JSON.stringify(value))).toString("base64");

beforeEach(() => {
  fetched.mockReset();
  saved.mockReset();
});

describe("downloadAccountData", () => {
  it("saves one readable file, the progress opened", async () => {
    const save = { format: 2, endless: [{ id: "a1b2c3d4e5f6" }] };
    fetched.mockResolvedValue({
      account: {
        publicId: "abcdefghijklmnop",
        createdAt: "2026-10-01T00:00:00.000Z",
        lastUsed: "2026-10-02",
      },
      identities: [
        { provider: "google", id: "123", linkedAt: "2026-10-01T00:00:00.000Z" },
      ],
      sessions: [{ endsAt: "2026-12-31T00:00:00.000Z" }],
      profile: null,
      missions: [{ mission: "daily-7", clearedAt: "2026-10-02T00:00:00.000Z" }],
      progress: {
        format: 2,
        revision: 3,
        savedAt: "2026-10-02T00:00:00.000Z",
        gzipBase64: gzipped(save),
      },
      progressBackup: null,
      verified: {
        dailyTimeZone: {
          zone: "Asia/Bangkok",
          setAt: "2026-10-02T00:00:00.000Z",
        },
        dailies: [
          {
            daily: "ost",
            puzzle: 6,
            attemptId: "abcdefghijklmnopqrstuvwxyz",
            startedAt: "2026-10-02T00:00:00.000Z",
            finishedAt: "2026-10-02T00:01:00.000Z",
            outcome: "won",
            tries: 2,
            moves: { guesses: [null, "7"] },
            timeMs: 60_000,
            timeCounted: true,
          },
        ],
        summaries: [],
        rooms: [],
      },
    });

    expect(await downloadAccountData()).toBe(true);
    const [name, blob] = saved.mock.calls[0];
    expect(name).toBe(accountFileName());
    expect(name).toMatch(/^baheardle-account-\d{4}-\d{2}-\d{2}\.json$/);
    const file = JSON.parse(await blob.text());
    expect(file).toMatchObject({
      account: { publicId: "abcdefghijklmnop" },
      identities: [{ provider: "google", id: "123" }],
      missions: [{ mission: "daily-7" }],
      progress: { format: 2, revision: 3, save },
      progressBackup: null,
      // The verified record as kept, apart from the save.
      verified: {
        dailyTimeZone: { zone: "Asia/Bangkok" },
        dailies: [
          { daily: "ost", outcome: "won", moves: { guesses: [null, "7"] } },
        ],
      },
    });
    expect(file.about).toContain("never imports into a save");
    expect(JSON.stringify(file)).not.toContain("gzipBase64");
  });

  it("saves nothing when signed out", async () => {
    fetched.mockResolvedValue(null);
    expect(await downloadAccountData()).toBe(false);
    expect(saved).not.toHaveBeenCalled();
  });
});
