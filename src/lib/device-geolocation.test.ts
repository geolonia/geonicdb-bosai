import { describe, expect, it } from "vitest";
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
  it("returns device coordinates from geolocation API", async () => {
    const geo = mockGeolocation({
      getCurrentPosition(success) {
        success({
          coords: {
            latitude: 35.6812,
            longitude: 139.7671,
            accuracy: 12,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
            toJSON() {
              return this;
            },
          },
          timestamp: 1_700_000_000_000,
          toJSON() {
            return this;
          },
        });
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
        success({
          coords: {
            latitude: 91,
            longitude: 0,
            accuracy: 1,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
            toJSON() {
              return this;
            },
          },
          timestamp: 1,
          toJSON() {
            return this;
          },
        });
      },
    });

    await expect(
      requestDevicePosition({ geolocation: geo }),
    ).rejects.toMatchObject({ code: "invalid-coords" });
  });

  /**
   * N-26 回帰: 公開 API にサーバ送信系が混入していないこと。
   * 変異注入で send/upload 等を export するとこのテストが赤くなる想定。
   */
  it("does not export server-upload helpers", async () => {
    const mod = await import("@/lib/device-geolocation");
    const banned = Object.keys(mod).filter((name) =>
      /send|upload|post|persist|save|store|transmit/i.test(name),
    );
    expect(banned).toEqual([]);
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
