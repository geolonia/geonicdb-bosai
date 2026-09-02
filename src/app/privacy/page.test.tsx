// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PrivacyPage from "@/app/privacy/page";

describe("PrivacyPage (N-26)", () => {
  it("states that location data stays on the device and is not stored on servers", () => {
    render(<PrivacyPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "プライバシーポリシー" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "位置情報の取扱い" })).toBeInTheDocument();
    const main = screen.getByRole("main");
    expect(main.textContent).toMatch(/端末内でのみ処理/);
    expect(main.textContent).toMatch(/サーバや外部サービスへ送信・保存しません/);
  });

  it("states that personal information is not collected on public pages", () => {
    render(<PrivacyPage />);
    expect(screen.getByRole("heading", { name: "個人情報の取扱い" })).toBeInTheDocument();
    const main = screen.getByRole("main");
    expect(main.textContent).toMatch(/個人情報を収集・保存しません/);
  });

  // near-miss: wording that admits server storage must fail even if "位置情報を" が直前に無い
  it("does not claim server-side storage or upload of location", () => {
    render(<PrivacyPage />);
    const main = screen.getByRole("main");
    expect(main.textContent).not.toMatch(/サーバに保存して/);
    expect(main.textContent).not.toMatch(/サーバーに保存/);
    expect(main.textContent).not.toMatch(/位置情報を送信して/);
  });
});
