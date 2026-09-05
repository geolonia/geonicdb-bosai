// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  bootstrapBeforeInstallPromptForTests,
  getStashedBeforeInstallPrompt,
  resetBeforeInstallPromptBootstrapForTests,
} from "@/lib/a2hs-bip-bridge";

function fireBeforeInstallPrompt() {
  const prompt = vi.fn().mockResolvedValue(undefined);
  const userChoice = Promise.resolve({ outcome: "accepted" as const });
  const event = new Event("beforeinstallprompt", {
    cancelable: true,
  }) as Event & {
    prompt: typeof prompt;
    userChoice: typeof userChoice;
  };
  event.prompt = prompt;
  event.userChoice = userChoice;
  window.dispatchEvent(event);
  return event;
}

describe("a2hs-bip-bridge (#60)", () => {
  beforeEach(() => {
    resetBeforeInstallPromptBootstrapForTests();
    bootstrapBeforeInstallPromptForTests();
  });

  afterEach(() => {
    resetBeforeInstallPromptBootstrapForTests();
  });

  it("stashes beforeinstallprompt before the dynamic A2HS chunk would load", () => {
    // TopPage が静的 import するブリッジだけで捕捉できること（prompt モジュール未ロード想定）
    expect(getStashedBeforeInstallPrompt()).toBeNull();
    const event = fireBeforeInstallPrompt();
    expect(getStashedBeforeInstallPrompt()).toBe(event);
  });
});
