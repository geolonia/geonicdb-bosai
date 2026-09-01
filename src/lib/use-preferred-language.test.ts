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
  vi.restoreAllMocks();
});

describe("usePreferredLanguage", () => {
  it("prefers the stored language over browser settings", () => {
    window.localStorage.setItem(LANG_STORAGE_KEY, "ko");
    setBrowserLanguages(["en-US"]);
    const { result } = renderHook(() => usePreferredLanguage());
    expect(result.current[0]).toBe("ko");
  });

  it("falls back to the browser language when nothing is stored", () => {
    setBrowserLanguages(["vi-VN", "en-US"]);
    const { result } = renderHook(() => usePreferredLanguage());
    expect(result.current[0]).toBe("vi");
  });

  it("falls back to Japanese when the browser language is unsupported", () => {
    setBrowserLanguages(["pt-BR", "ne-NP"]);
    const { result } = renderHook(() => usePreferredLanguage());
    expect(result.current[0]).toBe("ja");
  });

  // near-miss: localStorage に残った旧値はブラウザ言語判定へフォールバックする
  it("ignores an unsupported stored value and uses the browser language", () => {
    window.localStorage.setItem(LANG_STORAGE_KEY, "ja-easy");
    setBrowserLanguages(["en-US"]);
    const { result } = renderHook(() => usePreferredLanguage());
    expect(result.current[0]).toBe("en");
  });

  it("persists an explicit selection", () => {
    setBrowserLanguages(["en-US"]);
    const { result } = renderHook(() => usePreferredLanguage());
    act(() => result.current[1]("zh-CN"));
    expect(window.localStorage.getItem(LANG_STORAGE_KEY)).toBe("zh-CN");
    expect(result.current[0]).toBe("zh-CN");
  });
});
