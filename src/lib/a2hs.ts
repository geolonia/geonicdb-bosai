/** localStorage: 一度閉じたら再表示しない（#55） */
export const A2HS_DISMISS_STORAGE_KEY = "geonicdb-bosai-a2hs-dismissed";

export type NavigatorWithStandalone = Navigator & {
  /** iOS Safari 独自。ホーム画面から起動時に true */
  standalone?: boolean;
};

type MatchMediaHost = {
  matchMedia?: Window["matchMedia"] | unknown;
};

type StandaloneHost = {
  standalone?: unknown;
};

/**
 * 既に PWA（ホーム画面追加後）として起動しているか。
 * display-mode と iOS の navigator.standalone の両方を見る（#55）。
 * matchMedia / standalone が無い環境では throw せず false（防災トップを壊さない）。
 */
export function isRunningAsInstalledPwa(
  win: MatchMediaHost = typeof window !== "undefined" ? window : {},
  nav: StandaloneHost = typeof navigator !== "undefined"
    ? (navigator as StandaloneHost)
    : {},
): boolean {
  try {
    if (typeof win.matchMedia === "function") {
      if (win.matchMedia("(display-mode: standalone)").matches) {
        return true;
      }
    }
  } catch {
    // matchMedia 実装が壊れていてもトップ描画を継続する
  }

  try {
    return nav.standalone === true;
  } catch {
    return false;
  }
}

/**
 * iPhone / iPod / iPad（iPadOS のデスクトップ UA 含む）。
 * これらの環境では beforeinstallprompt が発火しない。
 */
export function isIosLikeDevice(
  nav: Partial<
    Pick<Navigator, "userAgent" | "platform" | "maxTouchPoints">
  > = typeof navigator !== "undefined" ? navigator : {},
): boolean {
  try {
    const ua = nav.userAgent ?? "";
    if (/iPad|iPhone|iPod/i.test(ua)) {
      return true;
    }
    // iPadOS 13+: Safari は MacIntel + タッチとして報告する
    return nav.platform === "MacIntel" && (nav.maxTouchPoints ?? 0) > 1;
  } catch {
    return false;
  }
}

export function isA2hsDismissed(
  storage: Pick<Storage, "getItem"> | null | undefined = typeof localStorage !==
  "undefined"
    ? localStorage
    : null,
): boolean {
  try {
    if (!storage || typeof storage.getItem !== "function") return false;
    return storage.getItem(A2HS_DISMISS_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissA2hsPrompt(
  storage: Pick<Storage, "setItem"> | null | undefined = typeof localStorage !==
  "undefined"
    ? localStorage
    : null,
): void {
  try {
    if (!storage || typeof storage.setItem !== "function") return;
    storage.setItem(A2HS_DISMISS_STORAGE_KEY, "1");
  } catch {
    // private mode 等でも呼び出し側を落とさない
  }
}
