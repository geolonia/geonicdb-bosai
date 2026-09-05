/** localStorage: 一度閉じたら再表示しない（#55） */
export const A2HS_DISMISS_STORAGE_KEY = "geonicdb-bosai-a2hs-dismissed";

export type NavigatorWithStandalone = Navigator & {
  /** iOS Safari 独自。ホーム画面から起動時に true */
  standalone?: boolean;
};

/**
 * 既に PWA（ホーム画面追加後）として起動しているか。
 * display-mode と iOS の navigator.standalone の両方を見る（#55）。
 */
export function isRunningAsInstalledPwa(
  win: Pick<Window, "matchMedia"> = window,
  nav: NavigatorWithStandalone = navigator,
): boolean {
  if (win.matchMedia("(display-mode: standalone)").matches) {
    return true;
  }
  return nav.standalone === true;
}

/**
 * iPhone / iPod / iPad（iPadOS のデスクトップ UA 含む）。
 * これらの環境では beforeinstallprompt が発火しない。
 */
export function isIosLikeDevice(
  nav: Pick<Navigator, "userAgent" | "platform" | "maxTouchPoints"> = navigator,
): boolean {
  if (/iPad|iPhone|iPod/i.test(nav.userAgent)) {
    return true;
  }
  // iPadOS 13+: Safari は MacIntel + タッチとして報告する
  return nav.platform === "MacIntel" && nav.maxTouchPoints > 1;
}

export function isA2hsDismissed(
  storage: Pick<Storage, "getItem"> = localStorage,
): boolean {
  return storage.getItem(A2HS_DISMISS_STORAGE_KEY) === "1";
}

export function dismissA2hsPrompt(
  storage: Pick<Storage, "setItem"> = localStorage,
): void {
  storage.setItem(A2HS_DISMISS_STORAGE_KEY, "1");
}
