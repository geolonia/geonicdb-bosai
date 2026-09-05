// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PushNotificationOptIn } from "@/components/top/PushNotificationOptIn";
import type { StoredWebPushState } from "@/lib/web-push-client";
import { testStrings } from "@/test/fixtures";

const enableWebPushNotifications =
  vi.fn<(options: { lang: string }) => Promise<StoredWebPushState>>();
const readStoredWebPushState = vi.fn<() => StoredWebPushState | null>(
  () => null,
);
const resolveWebPushRegisterUrl = vi.fn<() => string | null>(
  () => "/api/webpush",
);

vi.mock("@/lib/web-push-client", () => ({
  enableWebPushNotifications: (options: { lang: string }) =>
    enableWebPushNotifications(options),
  readStoredWebPushState: () => readStoredWebPushState(),
  resolveWebPushRegisterUrl: () => resolveWebPushRegisterUrl(),
}));

function stubPushApis() {
  Object.defineProperty(window, "Notification", {
    configurable: true,
    value: { permission: "default" },
  });
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: {},
  });
  Object.defineProperty(window, "PushManager", {
    configurable: true,
    value: function PushManager() {},
  });
}

describe("PushNotificationOptIn state transition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readStoredWebPushState.mockReturnValue(null);
    resolveWebPushRegisterUrl.mockReturnValue("/api/webpush");
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
      screen.queryByRole("button", { name: testStrings.pushEnableLabel }),
    ).not.toBeInTheDocument();
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
});
