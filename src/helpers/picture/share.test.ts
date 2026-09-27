import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { downloadBlob } from "../download";
import { sharePicture } from "./share";

vi.mock("../download", () => ({ downloadBlob: vi.fn() }));

const blob = new Blob(["png"], { type: "image/png" });

function allowShare(share: (data: ShareData) => Promise<void>) {
  Object.assign(navigator, { canShare: () => true, share: vi.fn(share) });
}

describe("sharePicture", () => {
  beforeEach(() => {
    vi.mocked(downloadBlob).mockClear();
  });

  afterEach(() => {
    Object.assign(navigator, { canShare: undefined, share: undefined });
  });

  it("opens the share sheet with the picture and text where it can", async () => {
    allowShare(() => Promise.resolve());

    await expect(sharePicture(blob, "a.png", "Heardle #1")).resolves.toBe(
      "shared"
    );
    const data = vi.mocked(navigator.share).mock.calls[0][0]!;
    expect(data.text).toBe("Heardle #1");
    expect(data.files?.[0].name).toBe("a.png");
    expect(downloadBlob).not.toHaveBeenCalled();
  });

  it("does nothing more when the player closes the share sheet", async () => {
    allowShare(() => Promise.reject(new DOMException("no", "AbortError")));

    await expect(sharePicture(blob, "a.png", "")).resolves.toBe("cancelled");
    expect(downloadBlob).not.toHaveBeenCalled();
  });

  it("saves the picture when sharing is refused or missing", async () => {
    allowShare(() => Promise.reject(new DOMException("no", "NotAllowedError")));
    await expect(sharePicture(blob, "a.png", "")).resolves.toBe("saved");

    Object.assign(navigator, { canShare: undefined, share: undefined });
    await expect(sharePicture(blob, "b.png", "")).resolves.toBe("saved");

    expect(vi.mocked(downloadBlob).mock.calls.map(([name]) => name)).toEqual([
      "a.png",
      "b.png",
    ]);
  });
});
