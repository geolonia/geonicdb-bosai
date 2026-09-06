// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OptionalFeatureBoundary } from "@/components/top/OptionalFeatureBoundary";
import { SiteFooter } from "@/components/top/SiteFooter";

function Boom(): never {
  throw new Error("intentional optional-feature failure");
}

describe("OptionalFeatureBoundary (#55)", () => {
  it("swallows child errors so siblings can keep rendering", () => {
    render(
      <div>
        <OptionalFeatureBoundary>
          <Boom />
        </OptionalFeatureBoundary>
        <p>主要情報は残る</p>
      </div>,
    );
    expect(screen.getByText("主要情報は残る")).toBeInTheDocument();
    expect(screen.queryByText(/intentional/)).not.toBeInTheDocument();
  });

  /**
   * near-miss (#66): SiteFooter の children で throw し boundary が無いと、
   * 連絡先まで巻き込んで落ちる（トグルだけ隔離する理由）。
   */
  it("near-miss: unwrapped throw in SiteFooter children takes down contact (#66)", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => {
      render(
        <SiteFooter
          accessibilityLabel="ウェブアクセシビリティ方針"
          testResultsLabel="試験結果"
          privacyLabel="プライバシーポリシー"
          linksLabel="フッターリンク"
          contactLabel="お問い合わせ"
          contactValue="防災担当: 000-0000-0000"
        >
          <Boom />
        </SiteFooter>,
      );
    }).toThrow(/intentional optional-feature failure/);
    expect(screen.queryByText(/お問い合わせ/)).not.toBeInTheDocument();
    spy.mockRestore();
  });

  it("keeps SiteFooter contact when children throw inside OptionalFeatureBoundary (#66)", () => {
    render(
      <SiteFooter
        accessibilityLabel="ウェブアクセシビリティ方針"
        testResultsLabel="試験結果"
        privacyLabel="プライバシーポリシー"
        linksLabel="フッターリンク"
        contactLabel="お問い合わせ"
        contactValue="防災担当: 000-0000-0000"
      >
        <OptionalFeatureBoundary>
          <Boom />
        </OptionalFeatureBoundary>
      </SiteFooter>,
    );
    expect(
      screen.getByText("お問い合わせ: 防災担当: 000-0000-0000"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "プライバシーポリシー" }),
    ).toBeInTheDocument();
  });
});
