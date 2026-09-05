// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  bootstrapBeforeInstallPromptForTests,
  getStashedBeforeInstallPrompt,
  resetBeforeInstallPromptBootstrapForTests,
  subscribeBeforeInstallPrompt,
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
    // boot / フォールバックだけで捕捉できること（prompt モジュール未ロード想定）
    expect(getStashedBeforeInstallPrompt()).toBeNull();
    const event = fireBeforeInstallPrompt();
    expect(getStashedBeforeInstallPrompt()).toBe(event);
  });

  it("replays stashed BIP when a subscriber registers after the event (#60)", () => {
    const event = fireBeforeInstallPrompt();
    const spy = vi.fn();
    const unsubscribe = subscribeBeforeInstallPrompt(spy);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(event);
    unsubscribe();
  });
});
