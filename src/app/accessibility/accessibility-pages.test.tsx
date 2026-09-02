// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { configureAxe } from "jest-axe";
import { describe, expect, it } from "vitest";
import AccessibilityPolicyPage from "@/app/accessibility/page";
import AccessibilityTestResultsPage from "@/app/accessibility/test-results/page";
import { SiteFooter } from "@/components/top/SiteFooter";
import {
  PLACEHOLDER_MARK,
  POLICY_HEADINGS,
  TEST_RESULT_JB31_FIELDS,
  WCAG22_ADDITIONS,
} from "@/config/accessibility-content";
import { testStrings } from "@/test/fixtures";

const runAxe = configureAxe({
  rules: {
    region: { enabled: false },
  },
});

describe("accessibility policy page (N-01)", () => {
  it("publishes required policy headings (not a stub summary only)", () => {
    render(<AccessibilityPolicyPage />);
    for (const heading of POLICY_HEADINGS) {
      expect(
        screen.getByRole("heading", { name: heading }),
      ).toBeInTheDocument();
    }
  });

  it("lists all WCAG 2.2 addition criteria from N-02", () => {
    render(<AccessibilityPolicyPage />);
    for (const row of WCAG22_ADDITIONS) {
      expect(screen.getByText(new RegExp(`^${row.id}\\b`))).toBeInTheDocument();
    }
  });

  it("marks municipality-specific fields as placeholders until filled", () => {
    render(<AccessibilityPolicyPage />);
    expect(
      screen.getAllByText(new RegExp(PLACEHOLDER_MARK)).length,
    ).toBeGreaterThan(0);
  });

  it("has no axe violations", async () => {
    const { container } = render(<AccessibilityPolicyPage />);
    expect(await runAxe(container)).toHaveNoViolations();
  });
});

describe("accessibility test results page (N-01 / JB.3.1)", () => {
  // 定数と別系統で固定し、リスト短縮だけでは green にならないようにする
  const requiredJb31Fields = [
    "表明日",
    "規格の規格番号及び改正年",
    "満たしている適合レベル",
    "対象となるウェブページに関する簡潔な説明",
    "依存したウェブコンテンツ技術のリスト",
    "試験対象のウェブページを選択した方法",
    "試験を行ったウェブページのURI",
    "達成基準チェックリスト",
    "試験実施期間",
  ] as const;

  it("exposes every JB.3.1 required field", () => {
    render(<AccessibilityTestResultsPage />);
    expect(TEST_RESULT_JB31_FIELDS).toEqual([...requiredJb31Fields]);
    for (const field of requiredJb31Fields) {
      const value = document.querySelector(`[data-jb31-field="${field}"]`);
      expect(value, `missing JB.3.1 field: ${field}`).not.toBeNull();
      expect(value?.textContent?.trim().length ?? 0).toBeGreaterThan(0);
    }
  });

  // near-miss: 類似ラベルだけでは JB.3.1 を満たしたことにしない
  it("does not treat a near-miss label as a JB.3.1 field", () => {
    render(<AccessibilityTestResultsPage />);
    expect(
      document.querySelector('[data-jb31-field="表明日（予定）"]'),
    ).toBeNull();
    expect(
      document.querySelector('[data-jb31-field="試験実施期間 "]'),
    ).toBeNull();
  });

  it("has no axe violations", async () => {
    const { container } = render(<AccessibilityTestResultsPage />);
    expect(await runAxe(container)).toHaveNoViolations();
  });
});

describe("SiteFooter consistent help (3.2.6)", () => {
  it("links to policy and test results in a stable order", () => {
    render(
      <SiteFooter
        accessibilityLabel={testStrings.footerAccessibility}
        testResultsLabel={testStrings.footerTestResults}
        linksLabel={testStrings.footerLinksLabel}
        contactLabel={testStrings.footerContact}
        contactValue={testStrings.footerContactValue}
      />,
    );
    const nav = screen.getByRole("navigation", {
      name: testStrings.footerLinksLabel,
    });
    const links = within(nav).getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute("href")).toMatch(/^\/accessibility\/?$/);
    expect(links[1].getAttribute("href")).toMatch(
      /^\/accessibility\/test-results\/?$/,
    );
    expect(
      screen.getByText(new RegExp(testStrings.footerContact)),
    ).toBeInTheDocument();
  });
});
