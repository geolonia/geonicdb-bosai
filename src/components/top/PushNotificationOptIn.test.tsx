// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PushNotificationOptIn } from "@/components/top/PushNotificationOptIn";
import { UI_STRINGS } from "@/config/ui-strings";
import type { StoredWebPushState } from "@/lib/web-push-client";
import {
  PUSH_OPT_IN_ANCHOR_ID,
  PUSH_OPT_IN_SWITCH_ID,
} from "@/lib/push-opt-in-banner";
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
const resyncWebPushSubscriptionLang =
  vi.fn<(options: { lang: string }) => Promise<StoredWebPushState>>();
const writeStoredWebPushState = vi.fn<(state: StoredWebPushState) => void>();
const readStoredWebPushState = vi.fn<() => StoredWebPushState | null>(
  () => null,
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
  resyncWebPushSubscriptionLang: (options: { lang: string }) =>
    resyncWebPushSubscriptionLang(options),
  writeStoredWebPushState: (state: StoredWebPushState) =>
    writeStoredWebPushState(state),
  readStoredWebPushState: () => readStoredWebPushState(),
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
    // denied でも resolve 経由で永続化済み状態を捨てる
    expect(resolveActiveWebPushState).toHaveBeenCalled();
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
    await user.click(await findSwitch());

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        testStrings.pushErrorLabel,
      );
    });
    // 失敗時はオン状態のまま（ローカルを消さない）
    expect(await findSwitch()).toHaveAttribute("aria-checked", "true");
  });

  it("shows iOS install hint and opens guide when Push APIs are missing (#65)", async () => {
    Reflect.deleteProperty(window, "Notification");
    Reflect.deleteProperty(navigator, "serviceWorker");
    Reflect.deleteProperty(window, "PushManager");
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    });
    Object.defineProperty(navigator, "platform", {
      configurable: true,
      value: "iPhone",
    });
    Object.defineProperty(navigator, "maxTouchPoints", {
      configurable: true,
      value: 5,
    });
    Object.defineProperty(navigator, "standalone", {
      configurable: true,
      value: false,
    });
    window.matchMedia = vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;

    const onOpenIosGuide = vi.fn();
    render(
      <PushNotificationOptIn
        lang="ja"
        strings={testStrings}
        onOpenIosGuide={onOpenIosGuide}
      />,
    );

    expect(
      await screen.findByTestId("push-ios-install-hint"),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      testStrings.pushIosInstallHint,
    );
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: testStrings.a2hsIosGuideOpenLabel }),
    );
    expect(onOpenIosGuide).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when Push APIs are missing outside actionable iOS Safari (#65)", () => {
    Reflect.deleteProperty(window, "Notification");
    Reflect.deleteProperty(navigator, "serviceWorker");
    Reflect.deleteProperty(window, "PushManager");
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value:
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0",
    });
    Object.defineProperty(navigator, "platform", {
      configurable: true,
      value: "Linux x86_64",
    });
    Object.defineProperty(navigator, "maxTouchPoints", {
      configurable: true,
      value: 0,
    });

    const { container } = render(
      <PushNotificationOptIn lang="ja" strings={testStrings} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  // near-miss: インストール済みなのに「追加すると〜」を出すのは矛盾
  it("near-miss: iOS standalone without PushManager renders nothing (#65)", () => {
    Reflect.deleteProperty(window, "Notification");
    Reflect.deleteProperty(navigator, "serviceWorker");
    Reflect.deleteProperty(window, "PushManager");
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)",
    });
    Object.defineProperty(navigator, "platform", {
      configurable: true,
      value: "iPhone",
    });
    Object.defineProperty(navigator, "maxTouchPoints", {
      configurable: true,
      value: 5,
    });
    Object.defineProperty(navigator, "standalone", {
      configurable: true,
      value: true,
    });
    window.matchMedia = vi.fn((query: string) => ({
      matches: query === "(display-mode: standalone)",
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;

    const { container } = render(
      <PushNotificationOptIn lang="ja" strings={testStrings} />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(
      screen.queryByText(testStrings.pushIosInstallHint),
    ).not.toBeInTheDocument();
  });

  it("renders nothing when API key is not configured", () => {
    isWebPushConfigured.mockReturnValue(false);

    const { container } = render(
      <PushNotificationOptIn lang="ja" strings={testStrings} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("resyncs GeonicDB subscription when display language changes (#61)", async () => {
    resolveActiveWebPushState.mockResolvedValue({
      subscriptionId: "urn:ngsi-ld:Subscription:test",
      endpoint: "https://fcm.googleapis.com/fcm/send/x",
      enabledAt: "2026-09-05T00:00:00.000Z",
      lang: "ja",
    });
    resyncWebPushSubscriptionLang.mockResolvedValue({
      subscriptionId: "urn:ngsi-ld:Subscription:en",
      endpoint: "https://fcm.googleapis.com/fcm/send/x",
      enabledAt: "2026-09-06T00:00:00.000Z",
      lang: "en",
    });

    const { rerender } = render(
      <PushNotificationOptIn lang="ja" strings={testStrings} />,
    );
    await findSwitch();
    expect(resyncWebPushSubscriptionLang).not.toHaveBeenCalled();

    rerender(<PushNotificationOptIn lang="en" strings={UI_STRINGS.en} />);

    await waitFor(() => {
      expect(resyncWebPushSubscriptionLang).toHaveBeenCalledWith({
        lang: "en",
      });
    });
  });

  it("turns toggle off when resync fails after clearing local state (#61)", async () => {
    resolveActiveWebPushState.mockResolvedValue({
      subscriptionId: "urn:ngsi-ld:Subscription:test",
      endpoint: "https://fcm.googleapis.com/fcm/send/x",
      enabledAt: "2026-09-05T00:00:00.000Z",
      lang: "ja",
    });
    resyncWebPushSubscriptionLang.mockRejectedValue(
      new Error("Web Push unregister failed: 500"),
    );
    readStoredWebPushState.mockReturnValue(null);

    const { rerender } = render(
      <PushNotificationOptIn lang="ja" strings={testStrings} />,
    );
    expect(await findSwitch()).toHaveAttribute("aria-checked", "true");

    rerender(<PushNotificationOptIn lang="en" strings={UI_STRINGS.en} />);

    await waitFor(() => {
      expect(resyncWebPushSubscriptionLang).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByRole("switch")).toHaveAttribute(
        "aria-checked",
        "false",
      );
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      UI_STRINGS.en.pushErrorLabel,
    );
  });

  it("claims missing stored.lang locally without GeonicDB resync (#61 no migration)", async () => {
    resolveActiveWebPushState.mockResolvedValue({
      subscriptionId: "urn:ngsi-ld:Subscription:legacy",
      endpoint: "https://fcm.googleapis.com/fcm/send/x",
      enabledAt: "2026-09-05T00:00:00.000Z",
    });

    render(<PushNotificationOptIn lang="ja" strings={testStrings} />);
    await findSwitch();

    await waitFor(() => {
      expect(writeStoredWebPushState).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionId: "urn:ngsi-ld:Subscription:legacy",
          lang: "ja",
        }),
      );
    });
    expect(resyncWebPushSubscriptionLang).not.toHaveBeenCalled();
  });

  it("exposes a stable anchor id so the header banner can link to the toggle", async () => {
    render(<PushNotificationOptIn lang="ja" strings={testStrings} />);
    const control = await findSwitch();

    expect(control).toHaveAttribute("id", PUSH_OPT_IN_SWITCH_ID);
    // near-miss: useId() の不透明な値だと `#id` アンカーの行き先にできない
    expect(control.id).not.toMatch(/^:.*:$/);
    expect(document.getElementById(PUSH_OPT_IN_ANCHOR_ID)).toContainElement(
      control,
    );
  });

  it("reports that opting in should be recommended while unsubscribed", async () => {
    const onOptInRecommendedChange = vi.fn<(recommended: boolean) => void>();
    render(
      <PushNotificationOptIn
        lang="ja"
        strings={testStrings}
        onOptInRecommendedChange={onOptInRecommendedChange}
      />,
    );
    await findSwitch();

    await waitFor(() => {
      expect(onOptInRecommendedChange).toHaveBeenLastCalledWith(true);
    });
  });

  it("stops recommending once the user is subscribed", async () => {
    resolveActiveWebPushState.mockResolvedValue({
      subscriptionId: "urn:ngsi-ld:Subscription:test",
      endpoint: "https://fcm.googleapis.com/fcm/send/x",
      enabledAt: "2026-09-05T00:00:00.000Z",
      lang: "ja",
    });
    const onOptInRecommendedChange = vi.fn<(recommended: boolean) => void>();
    render(
      <PushNotificationOptIn
        lang="ja"
        strings={testStrings}
        onOptInRecommendedChange={onOptInRecommendedChange}
      />,
    );
    await findSwitch();

    // near-miss: 購読済みでも true を投げると、通知オンの利用者に推奨帯が出る
    await waitFor(() => {
      expect(onOptInRecommendedChange).toHaveBeenCalled();
    });
    expect(onOptInRecommendedChange).not.toHaveBeenCalledWith(true);
  });

  it("stops recommending while an opt-in request is in flight", async () => {
    const user = userEvent.setup();
    let resolveEnable: (state: StoredWebPushState) => void = () => undefined;
    enableWebPushNotifications.mockImplementation(
      () =>
        new Promise<StoredWebPushState>((resolve) => {
          resolveEnable = resolve;
        }),
    );
    const onOptInRecommendedChange = vi.fn<(recommended: boolean) => void>();
    render(
      <PushNotificationOptIn
        lang="ja"
        strings={testStrings}
        onOptInRecommendedChange={onOptInRecommendedChange}
      />,
    );
    await user.click(await findSwitch());

    // 処理中はトグルが disabled なので、帯から飛ばしても focus() が効かず
    // フォーカスだけ画面上部に取り残される。
    // near-miss: phase を見ない実装はここで赤になる。
    await waitFor(() => {
      expect(onOptInRecommendedChange).toHaveBeenLastCalledWith(false);
    });
    expect(screen.getByRole("switch")).toBeDisabled();

    resolveEnable({
      subscriptionId: "urn:ngsi-ld:Subscription:test",
      endpoint: "https://fcm.googleapis.com/fcm/send/x",
      enabledAt: "2026-09-05T00:00:00.000Z",
      lang: "ja",
    });
  });

  it("stops recommending when the browser has denied notifications", async () => {
    stubPushApis("denied");
    const onOptInRecommendedChange = vi.fn<(recommended: boolean) => void>();
    render(
      <PushNotificationOptIn
        lang="ja"
        strings={testStrings}
        onOptInRecommendedChange={onOptInRecommendedChange}
      />,
    );

    await screen.findByText(testStrings.pushPermissionDeniedLabel);
    // 許可拒否では打つ手が無いので「オンにしましょう」と勧めない
    expect(onOptInRecommendedChange).not.toHaveBeenCalledWith(true);
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
