import { describe, expect, it } from "vitest";
import { injectA2hsBipBootScript } from "../../scripts/inject-a2hs-bip-boot.mjs";

describe("inject-a2hs-bip-boot (#60)", () => {
  it("inserts sync script src at the start of head without async/defer", () => {
    const input =
      '<html><head><meta charset="utf-8"/></head><body></body></html>';
    const { html, injected } = injectA2hsBipBootScript(
      input,
      "/a2hs-bip-boot.js",
    );
    expect(injected).toBe(true);
    expect(html).toMatch(
      /<head><script data-bosai-a2hs-bip-boot src="\/a2hs-bip-boot\.js"><\/script>/,
    );
    expect(html).not.toMatch(/a2hs-bip-boot\.js"[^>]*\basync\b/);
    expect(html).not.toMatch(/a2hs-bip-boot\.js"[^>]*\bdefer\b/);
  });

  it("is idempotent when the marker is already present", () => {
    const once = injectA2hsBipBootScript(
      "<html><head></head></html>",
      "/a2hs-bip-boot.js",
    ).html;
    const twice = injectA2hsBipBootScript(once, "/a2hs-bip-boot.js");
    expect(twice.injected).toBe(false);
    expect(twice.html).toBe(once);
  });
});
