import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearLoadedAudio, KEEP_SONGS, loadAudio } from "./audioSource";

const fetchMock = vi.fn();
let made = 0;

beforeEach(() => {
  made = 0;
  fetchMock.mockImplementation(() =>
    Promise.resolve(new Response(new Blob(["ogg"]), { status: 200 }))
  );
  vi.stubGlobal("fetch", fetchMock);
  URL.createObjectURL = vi.fn(() => `blob:local/${++made}`);
  URL.revokeObjectURL = vi.fn();
  clearLoadedAudio();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("loadAudio", () => {
  it("downloads a file once, however often it is asked for", async () => {
    const first = await loadAudio("/audio/a.ogg");
    const again = await loadAudio("/audio/a.ogg");

    expect(first).toBe("blob:local/1");
    expect(again).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fails on a missing file, and tries again next time", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }));

    await expect(loadAudio("/audio/a.ogg")).rejects.toThrow("404");
    await expect(loadAudio("/audio/a.ogg")).resolves.toBe("blob:local/1");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("frees the oldest files once it holds more than a few", async () => {
    for (const name of ["a", "b", "c", "d", "e"]) {
      await loadAudio(`/audio/${name}.ogg`);
    }
    await Promise.resolve();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:local/1");
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  describe("with a backup copy", () => {
    const worker = "https://worker.example.com";
    const backup = "https://backup.example.com";

    beforeEach(() => {
      vi.stubEnv("VITE_AUDIO_BASE_URL", worker);
      vi.stubEnv("VITE_AUDIO_BACKUP_URL", backup);
    });

    it("asks only the Worker while it answers", async () => {
      await loadAudio(`${worker}/a.ogg`);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(`${worker}/a.ogg`);
    });

    it("gets the file from the backup when the Worker fails", async () => {
      fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));

      await expect(loadAudio(`${worker}/a.ogg`)).resolves.toBe("blob:local/1");
      expect(fetchMock).toHaveBeenLastCalledWith(`${backup}/a.ogg`);
    });

    it("gets the file from the backup when the Worker lacks it", async () => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));

      await expect(loadAudio(`${worker}/a.ogg`)).resolves.toBe("blob:local/1");
      expect(fetchMock).toHaveBeenLastCalledWith(`${backup}/a.ogg`);
    });

    it("fails when the backup fails too", async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 404 }));

      await expect(loadAudio(`${worker}/a.ogg`)).rejects.toThrow(
        `404 for ${backup}/a.ogg`
      );
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});

/** Cache Storage, which jsdom lacks: one store, in the order put in. */
function fakeCaches() {
  const entries = new Map<string, Response>();
  const store = {
    match: vi.fn(async (url: string) => entries.get(url)?.clone()),
    put: vi.fn(async (url: string, response: Response) => {
      entries.delete(url);
      entries.set(url, response);
    }),
    keys: vi.fn(async () => [...entries.keys()].map((url) => ({ url }))),
    delete: vi.fn(async (request: { url: string }) =>
      entries.delete(request.url)
    ),
  };
  vi.stubGlobal("caches", { open: vi.fn(async () => store) });
  return entries;
}

/** Lets the store's writes, which aren't waited for, finish. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("the song store", () => {
  it("keeps a whole song and plays it from there next visit", async () => {
    const entries = fakeCaches();

    await loadAudio("/audio/song.ogg", { keep: true });
    await settle();
    expect([...entries.keys()]).toEqual(["/audio/song.ogg"]);

    // A new visit: nothing in memory, the store still has it.
    clearLoadedAudio();
    await loadAudio("/audio/song.ogg", { keep: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("doesn't keep clips", async () => {
    const entries = fakeCaches();
    await loadAudio("/audio/clip.ogg");
    await settle();
    expect(entries.size).toBe(0);
  });

  it("lets the songs played longest ago go", async () => {
    const entries = fakeCaches();
    for (let i = 0; i <= KEEP_SONGS; i++) {
      await loadAudio(`/audio/${i}.ogg`, { keep: true });
      await settle();
    }
    expect(entries.size).toBe(KEEP_SONGS);
    expect(entries.has("/audio/0.ogg")).toBe(false);
  });

  it("still plays where the browser has no store", async () => {
    vi.stubGlobal("caches", {
      open: vi.fn(() => Promise.reject(new Error("blocked"))),
    });
    await expect(loadAudio("/audio/song.ogg", { keep: true })).resolves.toBe(
      "blob:local/1"
    );
  });
});
