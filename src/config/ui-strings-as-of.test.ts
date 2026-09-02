import { describe, expect, it } from "vitest";
import {
  formatAsOfLabel,
  formatLoadError,
  formatTimeHHMM,
  UI_STRINGS,
} from "@/config/ui-strings";

describe("F-45 / as-of time labels", () => {
  // UTC → Asia/Tokyo で 12:34 になる入力（タイムゾーン変換を検証する）
  const iso = "2026-09-02T03:34:00Z";

  it("formats HH:MM in Asia/Tokyo", () => {
    expect(formatTimeHHMM(iso, "ja")).toBe("12:34");
  });

  it("builds as-of label from template", () => {
    expect(formatAsOfLabel(UI_STRINGS.ja.asOfLabel, iso, "ja")).toBe(
      "この情報は 12:34 時点",
    );
  });

  it("builds F-45 load error with last fetch time", () => {
    expect(formatLoadError(UI_STRINGS.ja, iso, "ja")).toBe(
      "情報を取得できません（最終取得 12:34）",
    );
  });

  it("near-miss: without lastFetchedAt keeps generic loadError (no empty HH:MM)", () => {
    expect(formatLoadError(UI_STRINGS.ja, null, "ja")).toBe(
      UI_STRINGS.ja.loadError,
    );
    expect(formatLoadError(UI_STRINGS.ja, null, "ja")).not.toMatch(/最終取得/);
  });
});
