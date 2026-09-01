// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SafeMarkdown } from "@/components/SafeMarkdown";
import { EmergencyBanner } from "@/components/top/EmergencyBanner";
import { SiteHeader } from "@/components/top/SiteHeader";
import { BANNER_VARIANT_COLORS } from "@/config/alert-colors";
import {
  ALL_BANNER_VARIANTS,
  makeBanner,
  testStrings,
} from "@/test/fixtures";

describe("SafeMarkdown", () => {
  it("renders safe markdown links as anchors", () => {
    render(<SafeMarkdown>{"詳しくは[方針](/accessibility)へ"}</SafeMarkdown>);
    const link = screen.getByRole("link", { name: "方針" });
    expect(link).toHaveAttribute("href", "/accessibility");
  });

  it("does not linkify javascript: URLs", () => {
    const { container } = render(
      <SafeMarkdown>{"危険な[クリック](javascript:alert(1))"}</SafeMarkdown>,
    );
    expect(container.querySelector("a")).toBeNull();
    expect(screen.getByText("クリック").tagName).toBe("SPAN");
  });

  // near-miss: protocol-relative looks like a path but must not become a link
  it("does not linkify protocol-relative URLs", () => {
    const { container } = render(
      <SafeMarkdown>{"危険な[外部](//evil.example/phish)"}</SafeMarkdown>,
    );
    expect(container.querySelector("a")).toBeNull();
  });
});

describe("EmergencyBanner variants", () => {
  it.each(ALL_BANNER_VARIANTS)(
    "applies role/aria-live/colors for %s",
    (variant) => {
      const { container } = render(
        <EmergencyBanner data={makeBanner(variant)} strings={testStrings} />,
      );
      const section = container.querySelector("section");
      expect(section).not.toBeNull();
      const isNeutral = variant === "notice";
      expect(section).toHaveAttribute("role", isNeutral ? "status" : "alert");
      expect(section).toHaveAttribute(
        "aria-live",
        isNeutral ? "polite" : "assertive",
      );
      const colors = BANNER_VARIANT_COLORS[variant];
      expect(section).toHaveStyle({
        backgroundColor: colors.bg,
        color: colors.text,
        borderColor: colors.border,
      });
    },
  );
});

describe("SiteHeader language switch", () => {
  it("calls onLangChange with the selected language", async () => {
    const user = userEvent.setup();
    const onLangChange = vi.fn();
    render(
      <SiteHeader strings={testStrings} lang="ja" onLangChange={onLangChange} />,
    );
    await user.selectOptions(screen.getByLabelText(testStrings.langLabel), [
      "en",
    ]);
    expect(onLangChange).toHaveBeenCalledWith("en");
  });
});
