import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const globalsCss = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../../app/globals.css"),
  "utf8",
);

/** `.push-opt-in__switch { ... }` ブロック本体を取り出す */
function extractRuleBody(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = globalsCss.match(
    new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, "m"),
  );
  expect(match, `rule for ${selector}`).toBeTruthy();
  return match![1];
}

describe("push-opt-in switch hit target (#56 / WCAG 2.5.8)", () => {
  it("sizes the input itself to at least 44px (not only the parent row)", () => {
    const switchRule = extractRuleBody(".push-opt-in__switch");

    // 当たり判定は input 自身。親 .push-opt-in__row の min-height 余白に頼らない。
    expect(switchRule).toMatch(/min-height:\s*2\.75rem\b/);
    expect(switchRule).toMatch(/min-width:\s*2\.75rem\b/);
    expect(switchRule).toMatch(/height:\s*2\.75rem\b/);

    // near-miss: 見た目レール高さ(1.75rem)だけを input の height にするとヒットが不足する
    expect(switchRule).not.toMatch(/height:\s*1\.75rem\b/);
  });

  it("draws the compact track with a non-interactive pseudo-element", () => {
    const track = extractRuleBody(".push-opt-in__switch::after");
    expect(track).toMatch(/height:\s*1\.75rem\b/);
    expect(track).toMatch(/pointer-events:\s*none\b/);
  });
});
