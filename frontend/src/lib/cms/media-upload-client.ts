/**
 * Client-side media upload transport (browser only).
 *
 * WHY THIS IS A SEPARATE MODULE
 * -----------------------------
 * TanStack server functions carry JSON, never a Blob/File, so every upload
 * path in the CMS must base64-encode the file first. `admin/media.tsx` grew
 * its own private `fileToBase64`, and the inline editor upload needed the
 * exact same conversion. Two copies of a transport detail is how a size cap or
 * an error message starts drifting between screens, so both now import this one
 * implementation.
 *
 * This is TRANSPORT ONLY. It performs no validation and no authorization:
 *   * the browser-side checks (MIME allowlist, 10 MB cap) are a convenience
 *     for fast feedback and live in components/cms/media/media-format.ts;
 *   * the AUTHORITATIVE checks are `validateUploadInput` +
 *     `validateImageMagicBytes` inside media-provider.ts, which run server-side
 *     inside `uploadMediaAsset` before any bucket I/O. Nothing here can weaken
 *     them, because nothing here is trusted.
 *
 * No server module may import this file.
 */

/**
 * Hard ceiling on the encoded payload. Mirrors MAX_BASE64_BYTES in
 * media-admin.loader.ts, which rejects anything larger on the server before
 * decoding. 10 MB of raw bytes is ~13.3 MB of base64; the slack below that
 * accounts for the header and rounding without ever letting a body that the
 * server would reject cross the network.
 */
export const MAX_UPLOAD_BASE64_CHARS = 10 * 1024 * 1024 * 1.4;

/**
 * Read a File as base64 (no `data:` prefix), matching what
 * `uploadAdminMedia` expects.
 *
 * Rejects when the file cannot be read or when the encoded payload exceeds
 * MAX_UPLOAD_BASE64_CHARS, so an oversized file fails locally instead of
 * uploading bytes that the server is going to throw away.
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const comma = result.indexOf(",");
      const base64 = comma >= 0 ? result.slice(comma + 1) : result;
      if (base64.length > MAX_UPLOAD_BASE64_CHARS) {
        reject(new Error("File is too large. The maximum is 10 MB."));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}
