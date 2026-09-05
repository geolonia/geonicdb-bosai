// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PushNotificationOptIn } from "@/components/top/PushNotificationOptIn";
import type { StoredWebPushState } from "@/lib/web-push-client";
import { testStrings } from "@/test/fixtures";

const enableWebPushNotifications =
  vi.fn<(options: { lang: string }) => Promise<StoredWebPushState>>();
const disableWebPushNotifications = vi.fn<() => Promise<void>>();
const resolveActiveWebPushState = vi.fn<
  () => Promise<StoredWebPushState | null>
>(async () => null);
const isWebPushConfigured = vi.fn<() => boolean>(() => true);
const syncServiceWorkerLang = vi.fn(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- mock arity
  async (..._args: [ServiceWorkerRegistration, string]) => undefined,
);

vi.mock("@/lib/web-push-client", () => ({
  enableWebPushNotifications: (options: { lang: string }) =>
    enableWebPushNotifications(options),
  disableWebPushNotifications: () => disableWebPushNotifications(),
  resolveActiveWebPushState: () => resolveActiveWebPushState(),
  isWebPushConfigured: () => isWebPushConfigured(),
  syncServiceWorkerLang: (
    registration: ServiceWorkerRegistration,
    lang: string,
  ) => syncServiceWorkerLang(registration, lang),
}));

function stubPushApis() {
  Object.defineProperty(window, "Notification", {
    configurable: true,
    value: { permission: "default" },
  });
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: {
      getRegistration: async () => ({
        pushManager: { getSubscription: async () => null },
      }),
    },
  });
  Object.defineProperty(window, "PushManager", {
    configurable: true,
    value: function PushManager() {},
  });
}

describe("PushNotificationOptIn state transition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveActiveWebPushState.mockResolvedValue(null);
    isWebPushConfigured.mockReturnValue(true);
    stubPushApis();
  });

  it("click → enable → shows 通知はオンです", async () => {
    const user = userEvent.setup();
    enableWebPushNotifications.mockResolvedValue({
      subscriptionId: "urn:ngsi-ld:Subscription:test",
      endpoint: "https://fcm.googleapis.com/fcm/send/x",
      enabledAt: "2026-09-05T00:00:00.000Z",
    });

    render(<PushNotificationOptIn lang="ja" strings={testStrings} />);

    const button = await screen.findByRole("button", {
      name: testStrings.pushEnableLabel,
    });
    await user.click(button);

    expect(enableWebPushNotifications).toHaveBeenCalledWith({ lang: "ja" });
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        testStrings.pushEnabledLabel,
      );
    });
    expect(
      screen.getByRole("button", { name: testStrings.pushDisableLabel }),
    ).toBeInTheDocument();
  });

  it("disable clears enabled state", async () => {
    const user = userEvent.setup();
    resolveActiveWebPushState.mockResolvedValue({
      subscriptionId: "urn:ngsi-ld:Subscription:test",
      endpoint: "https://fcm.googleapis.com/fcm/send/x",
      enabledAt: "2026-09-05T00:00:00.000Z",
    });
    disableWebPushNotifications.mockResolvedValue();

    render(<PushNotificationOptIn lang="ja" strings={testStrings} />);
    await user.click(
      await screen.findByRole("button", {
        name: testStrings.pushDisableLabel,
      }),
    );
    expect(disableWebPushNotifications).toHaveBeenCalled();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: testStrings.pushEnableLabel }),
      ).toBeInTheDocument();
    });
  });

  it("shows error when enable fails", async () => {
    const user = userEvent.setup();
    enableWebPushNotifications.mockRejectedValue(new Error("denied"));

    render(<PushNotificationOptIn lang="ja" strings={testStrings} />);
    await user.click(
      await screen.findByRole("button", { name: testStrings.pushEnableLabel }),
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        testStrings.pushErrorLabel,
      );
    });
  });

  it("shows error when disable fails (policy deny / DELETE non-2xx) (#51)", async () => {
    const user = userEvent.setup();
    resolveActiveWebPushState.mockResolvedValue({
      subscriptionId: "urn:ngsi-ld:Subscription:test",
      endpoint: "https://fcm.googleapis.com/fcm/send/x",
      enabledAt: "2026-09-05T00:00:00.000Z",
    });
    disableWebPushNotifications.mockRejectedValue(
      new Error("Web Push unregister failed: 403"),
    );

    render(<PushNotificationOptIn lang="ja" strings={testStrings} />);
    await user.click(
      await screen.findByRole("button", {
        name: testStrings.pushDisableLabel,
      }),
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        testStrings.pushErrorLabel,
      );
    });
    // 失敗時はオン状態のまま（ローカルを消さない）
    expect(
      screen.getByRole("button", { name: testStrings.pushDisableLabel }),
    ).toBeInTheDocument();
  });

  it("shows unsupported status when Push APIs are missing", async () => {
    // Notification / serviceWorker / PushManager を外す
    Reflect.deleteProperty(window, "Notification");
    Reflect.deleteProperty(navigator, "serviceWorker");
    Reflect.deleteProperty(window, "PushManager");

    render(<PushNotificationOptIn lang="ja" strings={testStrings} />);

    expect(await screen.findByRole("status")).toHaveTextContent(
      testStrings.pushUnsupportedLabel,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
