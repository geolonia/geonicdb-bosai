// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DeviceGeolocationError,
  distanceMetersBetween,
  isValidDeviceCoordinates,
  requestDevicePosition,
} from "@/lib/device-geolocation";

function mockGeolocation(
  impl: Pick<Geolocation, "getCurrentPosition">,
): Pick<Geolocation, "getCurrentPosition"> {
  return impl;
}

function successPosition(
  latitude: number,
  longitude: number,
  accuracy = 12,
  timestamp = 1_700_000_000_000,
): GeolocationPosition {
  return {
    coords: {
      latitude,
      longitude,
      accuracy,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      toJSON() {
        return this;
      },
    },
    timestamp,
    toJSON() {
      return this;
    },
  };
}

describe("isValidDeviceCoordinates", () => {
  it("accepts boundary latitudes and longitudes", () => {
    expect(isValidDeviceCoordinates(-90, -180)).toBe(true);
    expect(isValidDeviceCoordinates(90, 180)).toBe(true);
    expect(isValidDeviceCoordinates(0, 0)).toBe(true);
  });

  // near-miss: just outside valid ranges must be rejected
  it("rejects coordinates just outside valid ranges", () => {
    expect(isValidDeviceCoordinates(90.0001, 0)).toBe(false);
    expect(isValidDeviceCoordinates(-90.0001, 0)).toBe(false);
    expect(isValidDeviceCoordinates(0, 180.0001)).toBe(false);
    expect(isValidDeviceCoordinates(0, -180.0001)).toBe(false);
    expect(isValidDeviceCoordinates(Number.NaN, 0)).toBe(false);
    expect(isValidDeviceCoordinates(0, Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe("requestDevicePosition", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns device coordinates from geolocation API", async () => {
    const geo = mockGeolocation({
      getCurrentPosition(success) {
        success(successPosition(35.6812, 139.7671));
      },
    });

    const coords = await requestDevicePosition({ geolocation: geo });
    expect(coords).toEqual({
      latitude: 35.6812,
      longitude: 139.7671,
      accuracyMeters: 12,
      obtainedAt: 1_700_000_000_000,
    });
  });

  it("rejects when geolocation is unsupported", async () => {
    await expect(
      requestDevicePosition({
        geolocation: {} as Pick<Geolocation, "getCurrentPosition">,
      }),
    ).rejects.toMatchObject({ code: "unsupported" });
  });

  it("maps permission denied to DeviceGeolocationError", async () => {
    const geo = mockGeolocation({
      getCurrentPosition(_success, error) {
        error?.({
          code: 1,
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
          message: "denied",
        } as GeolocationPositionError);
      },
    });

    await expect(
      requestDevicePosition({ geolocation: geo }),
    ).rejects.toBeInstanceOf(DeviceGeolocationError);
    await expect(
      requestDevicePosition({ geolocation: geo }),
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("rejects invalid coordinates from the API", async () => {
    const geo = mockGeolocation({
      getCurrentPosition(success) {
        success(successPosition(91, 0, 1, 1));
      },
    });

    await expect(
      requestDevicePosition({ geolocation: geo }),
    ).rejects.toMatchObject({ code: "invalid-coords" });
  });

  /**
   * N-26: 座標取得中にネットワーク送信が発生しないこと（実挙動）。
   * 内部で fetch / XHR / sendBeacon を呼ぶ変異はここで赤くなる。
   */
  it("does not call fetch, XHR, or sendBeacon while obtaining position", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));
    const xhrOpenSpy = vi.spyOn(XMLHttpRequest.prototype, "open");
    const xhrSendSpy = vi.spyOn(XMLHttpRequest.prototype, "send");
    const beaconSpy = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      writable: true,
      value: beaconSpy,
    });

    const geo = mockGeolocation({
      getCurrentPosition(success) {
        success(successPosition(35.6812, 139.7671));
      },
    });

    await requestDevicePosition({ geolocation: geo });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrOpenSpy).not.toHaveBeenCalled();
    expect(xhrSendSpy).not.toHaveBeenCalled();
    expect(beaconSpy).not.toHaveBeenCalled();
  });
});

describe("distanceMetersBetween", () => {
  it("computes a short distance locally (Tokyo Station vicinity)", () => {
    const a = { latitude: 35.6812, longitude: 139.7671 };
    const b = { latitude: 35.682, longitude: 139.768 };
    const meters = distanceMetersBetween(a, b);
    expect(meters).toBeGreaterThan(50);
    expect(meters).toBeLessThan(200);
  });

  // near-miss: invalid endpoint must throw, not return NaN
  it("throws on invalid coordinates instead of returning NaN", () => {
    expect(() =>
      distanceMetersBetween(
        { latitude: 35, longitude: 139 },
        { latitude: 91, longitude: 0 },
      ),
    ).toThrow(DeviceGeolocationError);
  });
});
