import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const globalsCss = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../../app/globals.css"),
  "utf8",
);

function extractRuleBody(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = globalsCss.match(
    new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, "m"),
  );
  expect(match, `rule for ${selector}`).toBeTruthy();
  return match![1];
}

describe("a2hs-prompt button hit target (#55 / WCAG 2.5.8)", () => {
  it.each([".a2hs-prompt__install", ".a2hs-prompt__dismiss"] as const)(
    "%s sizes the control itself to at least 44px",
    (selector) => {
      const rule = extractRuleBody(selector);
      expect(rule).toMatch(/min-height:\s*2\.75rem\b/);
      expect(rule).toMatch(/min-width:\s*2\.75rem\b/);
    },
  );

  // near-miss: 見た目だけの padding では足りず、親 row の min-height に頼ると #56 差し戻しと同型
  it("near-miss: does not rely only on .a2hs-prompt__row min-height for hit area", () => {
    const install = extractRuleBody(".a2hs-prompt__install");
    expect(install).toMatch(/min-height:\s*2\.75rem\b/);
    expect(install).not.toMatch(/height:\s*1\.75rem\b/);
  });
});
