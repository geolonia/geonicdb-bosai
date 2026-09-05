/**
 * beforeinstallprompt の早期捕捉ブリッジ（#55 / #60）。
 *
 * AddToHomeScreenPrompt は next/dynamic で遅延ロードされるため、
 * リスナーをそのチャンク内だけに置くと mount 前発火を取りこぼす。
 * TopPage など静的バンドルから本モジュールを import し、先に登録する。
 */

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let stashedBeforeInstallPrompt: BeforeInstallPromptEvent | null = null;
const bipListeners = new Set<(event: BeforeInstallPromptEvent) => void>();

function notifyBipListeners(event: BeforeInstallPromptEvent): void {
  for (const listener of bipListeners) {
    listener(event);
  }
}

function onWindowBeforeInstallPrompt(event: Event): void {
  event.preventDefault();
  const bip = event as BeforeInstallPromptEvent;
  stashedBeforeInstallPrompt = bip;
  notifyBipListeners(bip);
}

export function ensureBeforeInstallPromptBootstrap(): void {
  if (typeof window === "undefined") return;
  const flagged = window as Window & { __bosaiA2hsBipBootstrapped?: boolean };
  if (flagged.__bosaiA2hsBipBootstrapped) return;
  flagged.__bosaiA2hsBipBootstrapped = true;
  window.addEventListener("beforeinstallprompt", onWindowBeforeInstallPrompt);
}

export function getStashedBeforeInstallPrompt(): BeforeInstallPromptEvent | null {
  return stashedBeforeInstallPrompt;
}

export function clearStashedBeforeInstallPrompt(): void {
  stashedBeforeInstallPrompt = null;
}

export function subscribeBeforeInstallPrompt(
  listener: (event: BeforeInstallPromptEvent) => void,
): () => void {
  ensureBeforeInstallPromptBootstrap();
  bipListeners.add(listener);
  return () => {
    bipListeners.delete(listener);
  };
}

/** テスト用: モジュール保持と bootstrap フラグをリセットする */
export function resetBeforeInstallPromptBootstrapForTests(): void {
  stashedBeforeInstallPrompt = null;
  bipListeners.clear();
  if (typeof window !== "undefined") {
    const flagged = window as Window & { __bosaiA2hsBipBootstrapped?: boolean };
    if (flagged.__bosaiA2hsBipBootstrapped) {
      window.removeEventListener(
        "beforeinstallprompt",
        onWindowBeforeInstallPrompt,
      );
      flagged.__bosaiA2hsBipBootstrapped = false;
    }
  }
}

/** テスト用: BIP 早期捕捉リスナーを再度張る */
export function bootstrapBeforeInstallPromptForTests(): void {
  ensureBeforeInstallPromptBootstrap();
}

// 静的 import 時点で登録（dynamic chunk 待ちにしない）
ensureBeforeInstallPromptBootstrap();
