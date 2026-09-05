import { clearAppBadgeSafely } from "@/lib/web-push-sw-logic";

/**
 * アプリがフォアグラウンドになったときにバッジを消す。
 * Badging API 未対応なら何もしない。
 */
export function installAppBadgeClearOnForeground(
  target: Pick<
    Window,
    "addEventListener" | "removeEventListener" | "navigator"
  > = window,
): () => void {
  const clear = () => {
    if (
      typeof document !== "undefined" &&
      document.visibilityState === "hidden"
    ) {
      return;
    }
    void clearAppBadgeSafely(target.navigator);
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
