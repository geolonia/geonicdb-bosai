// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getGeonicdbWsClientMock = vi.fn();

vi.mock("@/lib/geonicdb-public-client", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/geonicdb-public-client")
  >("@/lib/geonicdb-public-client");
  return {
    ...actual,
    getGeonicdbWsClient: () => getGeonicdbWsClientMock(),
  };
});

const { useBosaiLiveUpdates } = await import("@/lib/use-bosai-live-updates");

type Listener = (event: unknown) => void;

/** SDK クライアントの最小スタブ。登録されたリスナーを手で発火できる。 */
function createWsClientStub() {
  const listeners = new Map<string, Set<Listener>>();
  return {
    on: vi.fn((event: string, listener: Listener) => {
      const set = listeners.get(event) ?? new Set<Listener>();
      set.add(listener);
      listeners.set(event, set);
    }),
    off: vi.fn((event: string, listener: Listener) => {
      listeners.get(event)?.delete(listener);
    }),
    connect: vi.fn(() => Promise.resolve()),
    subscribe: vi.fn(),
    disconnect: vi.fn(),
    emit(event: string, payload?: unknown) {
      for (const listener of listeners.get(event) ?? []) listener(payload);
    },
    listenerCount(event: string) {
      return listeners.get(event)?.size ?? 0;
    },
  };
}

function createHandlers() {
  return {
    "bosai-Notice": vi.fn(),
    "bosai-EmergencyBanner": vi.fn(),
    "bosai-AlertLevel": vi.fn(),
  };
}

function setVisibility(state: DocumentVisibilityState) {
  vi.spyOn(document, "visibilityState", "get").mockReturnValue(state);
}

function callCounts(handlers: ReturnType<typeof createHandlers>) {
  return [
    handlers["bosai-Notice"].mock.calls.length,
    handlers["bosai-EmergencyBanner"].mock.calls.length,
    handlers["bosai-AlertLevel"].mock.calls.length,
  ];
}

beforeEach(() => {
  getGeonicdbWsClientMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useBosaiLiveUpdates: WS イベント", () => {
  it("entityUpdated の entityType に対応する refetch だけを呼ぶ", async () => {
    const client = createWsClientStub();
    getGeonicdbWsClientMock.mockReturnValue(client);
    const handlers = createHandlers();

    renderHook(() => useBosaiLiveUpdates(handlers));
    await act(async () => {});

    act(() => {
      client.emit("entityUpdated", { entityType: "bosai-AlertLevel" });
    });

    expect(callCounts(handlers)).toEqual([0, 0, 1]);
  });
});

describe("useBosaiLiveUpdates: 復帰時の取りこぼし回収 (#83)", () => {
  it("画面が可視に戻ったら3リソースすべてを再取得する", async () => {
    const client = createWsClientStub();
    getGeonicdbWsClientMock.mockReturnValue(client);
    const handlers = createHandlers();

    renderHook(() => useBosaiLiveUpdates(handlers));
    await act(async () => {});

    setVisibility("visible");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(callCounts(handlers)).toEqual([1, 1, 1]);
  });

  it("非可視になっただけでは再取得しない", async () => {
    const client = createWsClientStub();
    getGeonicdbWsClientMock.mockReturnValue(client);
    const handlers = createHandlers();

    renderHook(() => useBosaiLiveUpdates(handlers));
    await act(async () => {});

    setVisibility("hidden");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(callCounts(handlers)).toEqual([0, 0, 0]);
  });

  it("WSキー未設定（クライアントなし）でも復帰時の再取得は効く", async () => {
    getGeonicdbWsClientMock.mockReturnValue(null);
    const handlers = createHandlers();

    renderHook(() => useBosaiLiveUpdates(handlers));
    await act(async () => {});

    setVisibility("visible");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(callCounts(handlers)).toEqual([1, 1, 1]);
  });

  it("bfcache 復帰（pageshow persisted）で再取得する", async () => {
    getGeonicdbWsClientMock.mockReturnValue(null);
    const handlers = createHandlers();

    renderHook(() => useBosaiLiveUpdates(handlers));
    await act(async () => {});

    act(() => {
      window.dispatchEvent(
        new PageTransitionEvent("pageshow", { persisted: true }),
      );
    });

    expect(callCounts(handlers)).toEqual([1, 1, 1]);
  });

  it("通常ロードの pageshow（persisted=false）では再取得しない", async () => {
    getGeonicdbWsClientMock.mockReturnValue(null);
    const handlers = createHandlers();

    renderHook(() => useBosaiLiveUpdates(handlers));
    await act(async () => {});

    act(() => {
      window.dispatchEvent(
        new PageTransitionEvent("pageshow", { persisted: false }),
      );
    });

    expect(callCounts(handlers)).toEqual([0, 0, 0]);
  });

  it("再接続後の subscribed で再取得する（初回 subscribed は初期取得と重複するので無視）", async () => {
    const client = createWsClientStub();
    getGeonicdbWsClientMock.mockReturnValue(client);
    const handlers = createHandlers();

    renderHook(() => useBosaiLiveUpdates(handlers));
    await act(async () => {});

    act(() => {
      client.emit("subscribed");
    });
    expect(callCounts(handlers)).toEqual([0, 0, 0]);

    act(() => {
      client.emit("subscribed");
    });
    expect(callCounts(handlers)).toEqual([1, 1, 1]);
  });

  it("アンマウント後はイベントリスナーを残さない", async () => {
    const client = createWsClientStub();
    getGeonicdbWsClientMock.mockReturnValue(client);
    const handlers = createHandlers();

    const { unmount } = renderHook(() => useBosaiLiveUpdates(handlers));
    await act(async () => {});
    unmount();

    expect(client.listenerCount("entityUpdated")).toBe(0);
    expect(client.listenerCount("subscribed")).toBe(0);
    expect(client.disconnect).toHaveBeenCalled();

    setVisibility("visible");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(callCounts(handlers)).toEqual([0, 0, 0]);
  });
});
