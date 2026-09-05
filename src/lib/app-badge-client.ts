import {
  WEB_PUSH_RESET_UNREAD_MESSAGE,
  clearAppBadgeSafely,
} from "@/lib/web-push-sw-logic";

type BadgeClearTarget = Pick<
  Window,
  "addEventListener" | "removeEventListener" | "navigator"
>;

async function notifyServiceWorkerUnreadReset(
  nav: BadgeClearTarget["navigator"],
): Promise<void> {
  const serviceWorker = (
    nav as Navigator & {
      serviceWorker?: {
        getRegistration?: () => Promise<ServiceWorkerRegistration | undefined>;
      };
    }
  ).serviceWorker;
  if (!serviceWorker?.getRegistration) return;
  try {
    const registration = await serviceWorker.getRegistration();
    if (!registration) return;
    const worker =
      registration.active ?? registration.waiting ?? registration.installing;
    worker?.postMessage({ type: WEB_PUSH_RESET_UNREAD_MESSAGE });
  } catch {
    // SW 未登録・postMessage 失敗は無視（バッジ clear 自体は完了している）
  }
}

/**
 * アプリがフォアグラウンドになったときにバッジを消し、SW の未読件数も 0 にする。
 * Badging API 未対応なら何もしない。
 */
export function installAppBadgeClearOnForeground(
  target: BadgeClearTarget = window,
): () => void {
  const clear = () => {
    if (
      typeof document !== "undefined" &&
      document.visibilityState === "hidden"
    ) {
      return;
    }
    void clearAppBadgeSafely(target.navigator);
    void notifyServiceWorkerUnreadReset(target.navigator);
  };

  target.addEventListener("visibilitychange", clear);
  target.addEventListener("focus", clear);
  target.addEventListener("pageshow", clear);
  // 既に可視なら一度消す（通知クリック直後の復帰など）
  clear();

  return () => {
    target.removeEventListener("visibilitychange", clear);
    target.removeEventListener("focus", clear);
    target.removeEventListener("pageshow", clear);
  };
}
