import { afterEach, describe, expect, test, vi } from "vitest";

import { copyText } from "./clipboard";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("copyText (shell-clipboard-copy)", () => {
  test("uses the async Clipboard API when available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const ok = await copyText("hello");
    expect(ok).toBe(true);
    expect(writeText).toHaveBeenCalledWith("hello");
  });

  test("falls back to execCommand when the Clipboard API throws", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("blocked")) },
    });
    const exec = vi.fn().mockReturnValue(true);
    // jsdom has no execCommand by default.
    (document as unknown as { execCommand: unknown }).execCommand = exec;
    const ok = await copyText("fallback");
    expect(ok).toBe(true);
    expect(exec).toHaveBeenCalledWith("copy");
    delete (document as unknown as { execCommand?: unknown }).execCommand;
  });

  test("returns false when neither path works (never throws)", async () => {
    vi.stubGlobal("navigator", {});
    (document as unknown as { execCommand: unknown }).execCommand = vi.fn().mockReturnValue(false);
    const ok = await copyText("x");
    expect(ok).toBe(false);
    delete (document as unknown as { execCommand?: unknown }).execCommand;
  });
});
