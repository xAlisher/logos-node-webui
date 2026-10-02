// Global copy-to-clipboard helper — the web analogue of BlockchainView.qml's
// `copyText()`. In the native app the backend process can't touch the clipboard,
// so QML copies via a hidden TextEdit; on the web the clipboard lives in the one
// place too — the document — so every copy button routes through this one helper
// rather than each re-implementing navigator.clipboard with its own fallback.
//
// Returns true on success. Never throws: a blocked/absent Clipboard API (insecure
// context, permissions, jsdom) falls back to a hidden-textarea + execCommand, and
// a total failure resolves false so the caller can decide what to show.

/** Copy `text` to the clipboard. Resolves true on success, false otherwise. */
export async function copyText(text: string): Promise<boolean> {
  const value = text ?? "";

  // Preferred path: the async Clipboard API (secure contexts).
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }

  // Legacy fallback: a hidden textarea + document.execCommand("copy"). This is
  // the DOM-side mirror of the QML hidden-TextEdit trick.
  try {
    if (typeof document === "undefined") return false;
    const ta = document.createElement("textarea");
    ta.value = value;
    ta.setAttribute("readonly", "");
    ta.style.position = "absolute";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand?.("copy") ?? false;
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
