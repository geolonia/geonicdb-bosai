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
    expect(
      screen.getByRole("heading", { name: "位置情報の取扱い" }),
    ).toBeInTheDocument();
    const main = screen.getByRole("main");
    expect(main.textContent).toMatch(/端末内でのみ処理/);
    expect(main.textContent).toMatch(
      /サーバや外部サービスへ送信・保存しません/,
    );
  });

  it("states that personal information is not collected on public pages", () => {
    render(<PrivacyPage />);
    expect(
      screen.getByRole("heading", { name: "個人情報の取扱い" }),
    ).toBeInTheDocument();
    const main = screen.getByRole("main");
    expect(main.textContent).toMatch(/個人情報を収集・保存しません/);
  });

  it("documents Web Push opt-in and PushSubscription handling (#35)", () => {
    render(<PrivacyPage />);
    expect(
      screen.getByRole("heading", { name: "ブラウザ通知（Web Push）" }),
    ).toBeInTheDocument();
    const main = screen.getByRole("main");
    expect(main.textContent).toMatch(/PushSubscription/);
    expect(main.textContent).toMatch(/ページ読み込み時に自動では行いません/);
  });

  // near-miss: wording that admits server-side storage of location must fail
  it("does not claim server-side storage or upload of location", () => {
    render(<PrivacyPage />);
    const main = screen.getByRole("main");
    expect(main.textContent).not.toMatch(/位置情報をサーバに保存/);
    expect(main.textContent).not.toMatch(/位置情報を送信して/);
  });

  it("metadata description scopes device-only claim to location and notes Web Push exception", async () => {
    const mod = await import("@/app/privacy/page");
    const description = (mod.metadata as { description?: string }).description;
    expect(description).toMatch(
      /位置情報は端末側処理を優先しサーバに保存しない/,
    );
    expect(description).toMatch(/Web Push/);
    expect(description).toMatch(/GeonicDB/);
    // 旧メタ（広い「サーバに保存しない」だけ）への回帰を防ぐ
    expect(description).not.toBe(
      "位置情報・個人情報の取扱い方針の雛形（端末側処理を優先しサーバに保存しない）",
    );
  });
});
