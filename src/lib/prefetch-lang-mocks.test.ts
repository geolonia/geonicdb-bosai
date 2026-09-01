import { describe, expect, it, vi } from "vitest";
import { prefetchOtherLanguageMocks } from "@/lib/prefetch-lang-mocks";

describe("prefetchOtherLanguageMocks", () => {
  it("injects prefetch link tags for other languages", () => {
    // jsdom not required — document is provided when environment is jsdom;
    // in node this no-ops. Test the idempotent Set behavior via mock document.
    const appendChild = vi.fn();
    const createElement = vi.fn(() => ({
      rel: "",
      href: "",
      as: "",
      crossOrigin: "",
    }));
    vi.stubGlobal("document", {
      createElement,
      head: { appendChild },
    });

    prefetchOtherLanguageMocks("ja");
    expect(createElement).toHaveBeenCalled();
    expect(appendChild.mock.calls.length).toBeGreaterThan(0);

    const before = appendChild.mock.calls.length;
    prefetchOtherLanguageMocks("ja");
    // near-miss: second call should not duplicate already-prefetched hrefs
    expect(appendChild.mock.calls.length).toBe(before);

    vi.unstubAllGlobals();
  });
});
