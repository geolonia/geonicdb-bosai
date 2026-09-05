/**
 * beforeinstallprompt の早期捕捉ブリッジ（#55 / #60）。
 *
 * 実リスナーは postbuild が挿入する `a2hs-bip-boot.js`（out/ の head 先頭）が張る。
 * 本モジュールは stash の読み出しと React 側購読を担当する。
 * テスト環境など boot 未ロード時はフォールバックで自分で登録する。
 */

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type BosaiA2hsWindow = Window & {
  __bosaiA2hsBipBootstrapped?: boolean;
  __bosaiA2hsBip?: BeforeInstallPromptEvent | null;
};

let stashedBeforeInstallPrompt: BeforeInstallPromptEvent | null = null;
const bipListeners = new Set<(event: BeforeInstallPromptEvent) => void>();
let fallbackListening = false;
let customEventListening = false;

function notifyBipListeners(event: BeforeInstallPromptEvent): void {
  for (const listener of bipListeners) {
    listener(event);
  }
}

function readWindowStash(): BeforeInstallPromptEvent | null {
  if (typeof window === "undefined") return null;
  const w = window as BosaiA2hsWindow;
  return w.__bosaiA2hsBip ?? null;
}

function syncStashFromWindow(): BeforeInstallPromptEvent | null {
  const fromWindow = readWindowStash();
  if (fromWindow) {
    stashedBeforeInstallPrompt = fromWindow;
  }
  return stashedBeforeInstallPrompt;
}

function onWindowBeforeInstallPrompt(event: Event): void {
  event.preventDefault();
  const bip = event as BeforeInstallPromptEvent;
  stashedBeforeInstallPrompt = bip;
  if (typeof window !== "undefined") {
    (window as BosaiA2hsWindow).__bosaiA2hsBip = bip;
  }
  notifyBipListeners(bip);
}

function onBosaiBeforeInstallPrompt(): void {
  const bip = syncStashFromWindow();
  if (bip) {
    notifyBipListeners(bip);
  }
}

export function ensureBeforeInstallPromptBootstrap(): void {
  if (typeof window === "undefined") return;
  const w = window as BosaiA2hsWindow;

  // public boot が既に張っていれば CustomEvent で追従するだけ
  if (w.__bosaiA2hsBipBootstrapped) {
    syncStashFromWindow();
    if (!customEventListening) {
      customEventListening = true;
      window.addEventListener(
        "bosai:beforeinstallprompt",
        onBosaiBeforeInstallPrompt,
      );
    }
    return;
  }

  if (fallbackListening) return;
  fallbackListening = true;
  w.__bosaiA2hsBipBootstrapped = true;
  window.addEventListener("beforeinstallprompt", onWindowBeforeInstallPrompt);
}

export function getStashedBeforeInstallPrompt(): BeforeInstallPromptEvent | null {
  return syncStashFromWindow();
}

export function clearStashedBeforeInstallPrompt(): void {
  stashedBeforeInstallPrompt = null;
  if (typeof window !== "undefined") {
    (window as BosaiA2hsWindow).__bosaiA2hsBip = null;
  }
}

export function subscribeBeforeInstallPrompt(
  listener: (event: BeforeInstallPromptEvent) => void,
): () => void {
  ensureBeforeInstallPromptBootstrap();
  bipListeners.add(listener);
  // 購読前に stash 済みのイベントを取りこぼさない（#60 CodeRabbit）
  const current = syncStashFromWindow();
  if (current) {
    listener(current);
  }
  return () => {
    bipListeners.delete(listener);
  };
}

/** テスト用: モジュール保持と bootstrap フラグをリセットする */
export function resetBeforeInstallPromptBootstrapForTests(): void {
  stashedBeforeInstallPrompt = null;
  bipListeners.clear();
  if (typeof window !== "undefined") {
    const w = window as BosaiA2hsWindow;
    if (fallbackListening) {
      window.removeEventListener(
        "beforeinstallprompt",
        onWindowBeforeInstallPrompt,
      );
    }
    if (customEventListening) {
      window.removeEventListener(
        "bosai:beforeinstallprompt",
        onBosaiBeforeInstallPrompt,
      );
    }
    w.__bosaiA2hsBipBootstrapped = false;
    w.__bosaiA2hsBip = null;
  }
  fallbackListening = false;
  customEventListening = false;
}

/** テスト用: BIP 早期捕捉リスナーを再度張る */
export function bootstrapBeforeInstallPromptForTests(): void {
  ensureBeforeInstallPromptBootstrap();
}

// クライアントで評価されたら boot / フォールバックを確保
ensureBeforeInstallPromptBootstrap();
