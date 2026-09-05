// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SiteHeader } from "@/components/top/SiteHeader";
import { SITE_LANGUAGES } from "@/config/site-language";
import { UI_STRINGS } from "@/config/ui-strings";

const globalsCss = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "globals.css"),
  "utf8",
);

/** `.site-header__inner { ... }` ブロック本体を取り出す */
function extractRuleBody(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = globalsCss.match(
    new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, "m"),
  );
  expect(match, `rule for ${selector}`).toBeTruthy();
  return match![1];
}

describe("site-header language layout (#54)", () => {
  it("keeps language column fixed via 2-column grid (not flex-wrap)", () => {
    const inner = extractRuleBody(".site-header__inner");

    expect(inner).toMatch(/display:\s*grid\b/);
    expect(inner).toMatch(
      /grid-template-columns:\s*minmax\(\s*0\s*,\s*1fr\s*\)\s+auto\b/,
    );
    // near-miss: flex + wrap に戻すとタイトル幅差で言語選択が次行左端へ飛ぶ
    expect(inner).not.toMatch(/flex-wrap\s*:/);
    expect(inner).not.toMatch(/display:\s*flex\b/);
  });

  it("lets the brand column shrink so the title wraps instead of pushing lang", () => {
    const brand = extractRuleBody(".site-header__brand");
    expect(brand).toMatch(/min-width:\s*0\b/);

    const brandChild = extractRuleBody(".site-header__brand > div");
    expect(brandChild).toMatch(/min-width:\s*0\b/);

    const lang = extractRuleBody(".site-header__lang");
    expect(lang).toMatch(/justify-self:\s*end\b/);
  });

  it("preserves lang control structure for every site language", () => {
    // タイトル幅は言語ごとに大きく異なる（レイアウト固定が必要な根拠）
    const titleLengths = SITE_LANGUAGES.map(
      (lang) => UI_STRINGS[lang].siteTitle.length,
    );
    expect(Math.max(...titleLengths)).toBeGreaterThan(
      Math.min(...titleLengths),
    );
    expect(UI_STRINGS.vi.siteTitle.length).toBe(Math.max(...titleLengths));

    for (const lang of SITE_LANGUAGES) {
      const strings = UI_STRINGS[lang];
      const { container, unmount } = render(
        <SiteHeader strings={strings} lang={lang} onLangChange={vi.fn()} />,
      );

      const inner = container.querySelector(".site-header__inner");
      expect(inner).toBeTruthy();
      const children = Array.from(inner!.children);
      expect(children.map((el) => el.className)).toEqual([
        "site-header__brand",
        "site-header__lang",
      ]);

      const select = screen.getByLabelText(strings.langLabel);
      expect(select).toHaveAttribute("id", "site-lang");
      expect(select).toHaveClass("site-header__lang-select");
      expect(select).toHaveValue(lang);

      unmount();
    }
  });
});
