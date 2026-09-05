// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LANG_STORAGE_KEY } from "@/config/site-language";
import { usePreferredLanguage } from "@/lib/use-preferred-language";

function setBrowserLanguages(languages: readonly string[]) {
  vi.spyOn(navigator, "languages", "get").mockReturnValue([...languages]);
}

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.lang = "";
  vi.restoreAllMocks();
});

describe("usePreferredLanguage", () => {
  it("prefers the stored language over browser settings", () => {
    window.localStorage.setItem(LANG_STORAGE_KEY, "ko");
    setBrowserLanguages(["en-US"]);
    document.documentElement.lang = "ja";
    const { result } = renderHook(() => usePreferredLanguage());
    expect(result.current[0]).toBe("ko");
  });

  it("prefers SSR documentElement.lang over browser language (#60 CLS)", () => {
    // hydration で ja→en に切り替わると main がシフトする（CI LHR 実測）
    document.documentElement.lang = "ja";
    setBrowserLanguages(["en-US", "en"]);
    const { result } = renderHook(() => usePreferredLanguage());
    expect(result.current[0]).toBe("ja");
  });

  it("falls back to the browser language when nothing is stored and DOM lang is empty", () => {
    document.documentElement.lang = "";
    setBrowserLanguages(["vi-VN", "en-US"]);
    const { result } = renderHook(() => usePreferredLanguage());
    expect(result.current[0]).toBe("vi");
  });

  it("falls back to Japanese when the browser language is unsupported", () => {
    document.documentElement.lang = "";
    setBrowserLanguages(["pt-BR", "ne-NP"]);
    const { result } = renderHook(() => usePreferredLanguage());
    expect(result.current[0]).toBe("ja");
  });

  // near-miss: localStorage に残った旧値は DOM lang / ブラウザ言語判定へフォールバックする
  it("ignores an unsupported stored value and uses SSR lang when present", () => {
    window.localStorage.setItem(LANG_STORAGE_KEY, "ja-easy");
    document.documentElement.lang = "ja";
    setBrowserLanguages(["en-US"]);
    const { result } = renderHook(() => usePreferredLanguage());
    expect(result.current[0]).toBe("ja");
  });

  it("persists an explicit selection", () => {
    document.documentElement.lang = "ja";
    setBrowserLanguages(["en-US"]);
    const { result } = renderHook(() => usePreferredLanguage());
    act(() => result.current[1]("zh-CN"));
    expect(window.localStorage.getItem(LANG_STORAGE_KEY)).toBe("zh-CN");
    expect(result.current[0]).toBe("zh-CN");
  });
});
