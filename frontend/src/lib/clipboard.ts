/**
 * Clipboard write with a graceful degradation path.
 *
 * WHY THIS EXISTS
 * ---------------
 * Every copy affordance in the Control Center (asset id, delivery URL, ...) must
 * place ONE EXACT STRING on the clipboard, and must never leave the user
 * guessing whether it worked. There used to be several independent
 * `navigator.clipboard?.writeText(...)` call sites, each with its own success
 * wording and its own way of failing silently. This module is the single
 * implementation they all funnel through, so "copy" behaves identically
 * everywhere and is testable without a DOM component harness.
 *
 * THE FAILURE MODES THIS ACTUALLY HANDLES
 * ---------------------------------------
 * `navigator.clipboard.writeText()` is NOT assumed to exist and is NOT assumed
 * to succeed:
 *
 *  1. `navigator.clipboard` is `undefined` on an insecure origin (plain http,
 *     or a non-localhost LAN address) and in older engines. Touching
 *     `.writeText` on it throws a TypeError.
 *  2. `writeText()` REJECTS when the document is not focused, when the user
 *     denies clipboard-read permission, or when a Permissions-Policy blocks
 *     it.
 *  3. Some embedded/third-party webviews ship neither API.
 *
 * Cases 1 and 3 fall straight through to the legacy `execCommand("copy")`
 * path; case 2 falls through to it AFTER the rejection. So a denied permission
 * degrades to a synchronous copy instead of a dead button.
 *
 * GUARANTEES: this never throws and never rejects. Callers get a boolean and
 * decide their own feedback, so a clipboard failure can never crash a route or
 * surface as an unhandled rejection.
 *
 * No dependency is added for this: both mechanisms are built into the browser.
 */

/** Shape we rely on, kept narrow so a partial/mock Clipboard is accepted. */
type ClipboardWriter = { writeText: (text: string) => Promise<void> };

/**
 * Returns the async Clipboard API only when it is genuinely usable, else null.
 * Reads globals at CALL time (never at module scope) so the module stays safe
 * to import during SSR, where there is no `navigator` at all.
 */
function getClipboardApi(): ClipboardWriter | null {
  const api: unknown = typeof navigator === "undefined" ? undefined : navigator.clipboard;
  if (api === null || typeof api !== "object") return null;
  const writeText = (api as { writeText?: unknown }).writeText;
  if (typeof writeText !== "function") return null;
  return api as ClipboardWriter;
}

/**
 * Last-resort synchronous copy via a staged, off-screen <textarea>.
 *
 * The staging node is `position: fixed` and 1x1px so appending it cannot
 * reflow the card/modal it lives in and focus cannot scroll the page, and it is
 * always removed in `finally` — including when `execCommand` throws. Focus is
 * handed back to whatever had it, so a fallback copy does not steal the caret
 * out of the search field or another control.
 */
function copyViaExecCommand(text: string): boolean {
  if (typeof document === "undefined" || document.body === null) return false;
  const execCommand = (document as { execCommand?: unknown }).execCommand;
  if (typeof execCommand !== "function") return false;

  const previouslyFocused: unknown = document.activeElement;
  const staging = document.createElement("textarea");
  staging.value = text;
  staging.setAttribute("readonly", "");
  staging.setAttribute("aria-hidden", "true");
  staging.tabIndex = -1;
  staging.style.cssText =
    "position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;opacity:0;pointer-events:none;";

  document.body.appendChild(staging);
  try {
    staging.focus();
    staging.select();
    staging.setSelectionRange(0, text.length);
    return (execCommand as (command: string) => boolean).call(document, "copy") === true;
  } catch {
    return false;
  } finally {
    staging.remove();
    const restore = previouslyFocused as { focus?: unknown } | null;
    if (restore !== null && typeof restore?.focus === "function") {
      (restore.focus as () => void).call(previouslyFocused);
    }
  }
}

/**
 * Put `text` on the clipboard verbatim — no trimming, no normalisation, no
 * derived/shortened form. The caller owns what "success" looks like.
 *
 * @returns true when the text reached the clipboard by either path.
 */
export async function writeClipboardText(text: string): Promise<boolean> {
  // Nothing meaningful to copy; do not report success for an empty write.
  if (text === "") return false;

  const api = getClipboardApi();
  if (api !== null) {
    try {
      await api.writeText(text);
      return true;
    } catch {
      // Unfocused document / denied permission / blocked by policy — degrade
      // instead of reporting a hard failure.
    }
  }
  return copyViaExecCommand(text);
}
