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

  it("keeps the prompt out of document flow to avoid CLS (#55)", () => {
    const rule = extractRuleBody(".a2hs-prompt");
    expect(rule).toMatch(/position:\s*fixed\b/);
    expect(rule).toMatch(/bottom:\s*0\b/);
  });

  it("reserves body padding while the fixed bar is visible (#55)", () => {
    // fixed のとき対応する余白確保が無いと末尾が帯の裏に隠れる
    const reserve = extractRuleBody("html.a2hs-prompt-visible body");
    expect(reserve).toMatch(/padding-bottom:\s*var\(--a2hs-reserve\)/);
  });

  it("reserves scrollbar gutter to avoid classic-scrollbar CLS (#60)", () => {
    // `html {` のみ（`html.a2hs-...` に誤マッチしない）
    const match = globalsCss.match(/^html\s*\{([^}]*)\}/m);
    expect(match, "rule for html").toBeTruthy();
    expect(match![1]).toMatch(/scrollbar-gutter:\s*stable/);
  });

  it("includes iOS safe-area inset in the fixed bar padding (#55)", () => {
    const rule = extractRuleBody(".a2hs-prompt");
    expect(rule).toMatch(/safe-area-inset-bottom/);
  });

  // near-miss: fixed だけあって余白ルールが無い状態を許さない
  it("near-miss: fixed bar must not exist without a matching body reserve rule", () => {
    const bar = extractRuleBody(".a2hs-prompt");
    expect(bar).toMatch(/position:\s*fixed\b/);
    expect(globalsCss).toMatch(
      /html\.a2hs-prompt-visible\s+body\s*\{[^}]*padding-bottom:\s*var\(--a2hs-reserve\)/,
    );
  });
});
