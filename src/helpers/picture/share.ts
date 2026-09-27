import { downloadBlob } from "../download";

export type ShareOutcome = "shared" | "saved" | "cancelled";

/**
 * Opens the device's share sheet with the picture where the browser can share
 * files (most phones), so it goes straight to X or anywhere else. Elsewhere
 * the picture is saved as a download instead.
 */
export async function sharePicture(
  blob: Blob,
  fileName: string,
  text: string
): Promise<ShareOutcome> {
  const file = new File([blob], fileName, { type: blob.type || "image/png" });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled";
      }
      // Refused for another reason: saving it still works.
    }
  }

  downloadBlob(fileName, blob);
  return "saved";
}
