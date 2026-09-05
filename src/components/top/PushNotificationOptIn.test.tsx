// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PushNotificationOptIn } from "@/components/top/PushNotificationOptIn";
import { UI_STRINGS } from "@/config/ui-strings";
import type { StoredWebPushState } from "@/lib/web-push-client";
import { SITE_LANGUAGES } from "@/config/site-language";
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

function stubPushApis(permission: NotificationPermission = "default") {
  Object.defineProperty(window, "Notification", {
    configurable: true,
    value: { permission },
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

function setNotificationPermission(permission: NotificationPermission) {
  Object.defineProperty(window, "Notification", {
    configurable: true,
    value: { permission },
  });
}

async function findSwitch() {
  return screen.findByRole("switch", {
    name: testStrings.pushToggleLabel,
  });
}

describe("PushNotificationOptIn state transition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveActiveWebPushState.mockResolvedValue(null);
    isWebPushConfigured.mockReturnValue(true);
    stubPushApis();
  });

  it("off → on → off updates aria-checked", async () => {
    const user = userEvent.setup();
    enableWebPushNotifications.mockResolvedValue({
      subscriptionId: "urn:ngsi-ld:Subscription:test",
      endpoint: "https://fcm.googleapis.com/fcm/send/x",
      enabledAt: "2026-09-05T00:00:00.000Z",
    });
    disableWebPushNotifications.mockResolvedValue();

    render(<PushNotificationOptIn lang="ja" strings={testStrings} />);

    const toggle = await findSwitch();
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText(testStrings.pushToggleDescriptionOff)).toBeTruthy();

    await user.click(toggle);
    expect(enableWebPushNotifications).toHaveBeenCalledWith({ lang: "ja" });
    await waitFor(() => {
      expect(toggle).toHaveAttribute("aria-checked", "true");
    });
    expect(screen.getByText(testStrings.pushToggleDescriptionOn)).toBeTruthy();

    await user.click(toggle);
    expect(disableWebPushNotifications).toHaveBeenCalled();
    await waitFor(() => {
      expect(toggle).toHaveAttribute("aria-checked", "false");
    });
  });

  it("disables the switch with aria-busy while toggling", async () => {
    const user = userEvent.setup();
    let resolveEnable: (value: StoredWebPushState) => void = () => undefined;
    enableWebPushNotifications.mockImplementation(
      () =>
        new Promise<StoredWebPushState>((resolve) => {
          resolveEnable = resolve;
        }),
    );

    render(<PushNotificationOptIn lang="ja" strings={testStrings} />);
    const toggle = await findSwitch();
    await user.click(toggle);

    await waitFor(() => {
      expect(toggle).toBeDisabled();
      expect(toggle).toHaveAttribute("aria-busy", "true");
    });
    expect(screen.getByText(testStrings.pushBusyLabel)).toBeTruthy();

    resolveEnable({
      subscriptionId: "urn:ngsi-ld:Subscription:test",
      endpoint: "https://fcm.googleapis.com/fcm/send/x",
      enabledAt: "2026-09-05T00:00:00.000Z",
    });
    await waitFor(() => {
      expect(toggle).not.toBeDisabled();
      expect(toggle).toHaveAttribute("aria-busy", "false");
    });
  });

  it("shows permission-denied guidance instead of a switch when already denied", async () => {
    stubPushApis("denied");

    render(<PushNotificationOptIn lang="ja" strings={testStrings} />);

    expect(await screen.findByRole("status")).toHaveTextContent(
      testStrings.pushPermissionDeniedLabel,
    );
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("switches to permission-denied guidance when requestPermission yields denied", async () => {
    const user = userEvent.setup();
    enableWebPushNotifications.mockImplementation(async () => {
      setNotificationPermission("denied");
      throw new Error("Notification permission denied");
    });

    render(<PushNotificationOptIn lang="ja" strings={testStrings} />);
    await user.click(await findSwitch());

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        testStrings.pushPermissionDeniedLabel,
      );
    });
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.queryByText(testStrings.pushErrorLabel),
    ).not.toBeInTheDocument();
  });

  it("shows generic error (not denied guidance) when enable fails without denied permission", async () => {
    const user = userEvent.setup();
    // near-miss: エラーメッセージに denied とあっても permission は default のまま
    enableWebPushNotifications.mockRejectedValue(
      new Error("Notification permission denied"),
    );

    render(<PushNotificationOptIn lang="ja" strings={testStrings} />);
    await user.click(await findSwitch());

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        testStrings.pushErrorLabel,
      );
    });
    expect(screen.getByRole("switch")).toBeInTheDocument();
    expect(
      screen.queryByText(testStrings.pushPermissionDeniedLabel),
    ).not.toBeInTheDocument();
  });

  it("shows error when disable fails", async () => {
    const user = userEvent.setup();
    resolveActiveWebPushState.mockResolvedValue({
      subscriptionId: "urn:ngsi-ld:Subscription:test",
      endpoint: "https://fcm.googleapis.com/fcm/send/x",
      enabledAt: "2026-09-05T00:00:00.000Z",
    });
    disableWebPushNotifications.mockRejectedValue(new Error("server error"));

    render(<PushNotificationOptIn lang="ja" strings={testStrings} />);
    await user.click(await findSwitch());

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        testStrings.pushErrorLabel,
      );
    });
    expect(await findSwitch()).toHaveAttribute("aria-checked", "true");
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
    Reflect.deleteProperty(window, "Notification");
    Reflect.deleteProperty(navigator, "serviceWorker");
    Reflect.deleteProperty(window, "PushManager");

    render(<PushNotificationOptIn lang="ja" strings={testStrings} />);

    expect(await screen.findByRole("status")).toHaveTextContent(
      testStrings.pushUnsupportedLabel,
    );
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("renders nothing when API key is not configured", () => {
    isWebPushConfigured.mockReturnValue(false);

    const { container } = render(
      <PushNotificationOptIn lang="ja" strings={testStrings} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("provides toggle and denied strings in all site languages", () => {
    for (const lang of SITE_LANGUAGES) {
      const s = UI_STRINGS[lang];
      expect(s.pushToggleLabel.length).toBeGreaterThan(0);
      expect(s.pushToggleDescriptionOff.length).toBeGreaterThan(0);
      expect(s.pushToggleDescriptionOn.length).toBeGreaterThan(0);
      expect(s.pushPermissionDeniedLabel.length).toBeGreaterThan(0);
      expect(s.pushPermissionDeniedLabel).not.toEqual(s.pushErrorLabel);
    }
  });
});
