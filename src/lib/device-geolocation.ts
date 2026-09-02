/**
 * 端末側の位置情報取得（N-26）。
 *
 * 座標はブラウザの Geolocation API からのみ取得し、このモジュールは
 * サーバ送信・永続化用の API を意図的に公開しない。地図・距離計算など
 * 端末内の同期処理にだけ渡すこと（#3 ハザードマップ等）。
 *
 * 仕様 5.8.4: 位置情報の許可要求はページ読み込み時に自動で行わず、
 * 利用者の操作を契機とすること。呼び出し側でボタン等のイベントから呼ぶ。
 */

export type DeviceCoordinates = {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  obtainedAt: number;
};

export type DeviceGeolocationErrorCode =
  | "unsupported"
  | "permission-denied"
  | "position-unavailable"
  | "timeout"
  | "invalid-coords";

export class DeviceGeolocationError extends Error {
  readonly code: DeviceGeolocationErrorCode;

  constructor(code: DeviceGeolocationErrorCode, message: string) {
    super(message);
    this.name = "DeviceGeolocationError";
    this.code = code;
  }
}

export type RequestDevicePositionOptions = {
  /** 高精度（GPS 等）。既定 false。 */
  enableHighAccuracy?: boolean;
  /** ミリ秒。既定 10_000。 */
  timeoutMs?: number;
  /** キャッシュ許容（ミリ秒）。既定 0（常に新規取得）。 */
  maximumAgeMs?: number;
  /**
   * テスト注入用。未指定時は `navigator.geolocation`。
   * 本番コードからは渡さない。
   */
  geolocation?: Pick<Geolocation, "getCurrentPosition">;
};

function mapPositionError(err: GeolocationPositionError): DeviceGeolocationError {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return new DeviceGeolocationError(
        "permission-denied",
        "位置情報の利用が拒否されました",
      );
    case err.POSITION_UNAVAILABLE:
      return new DeviceGeolocationError(
        "position-unavailable",
        "位置情報を取得できませんでした",
      );
    case err.TIMEOUT:
      return new DeviceGeolocationError(
        "timeout",
        "位置情報の取得がタイムアウトしました",
      );
    default:
      return new DeviceGeolocationError(
        "position-unavailable",
        "位置情報を取得できませんでした",
      );
  }
}

/**
 * 緯度・経度が有限で、地理座標として妥当な範囲か。
 * near-miss（境界外）は拒否する。
 */
export function isValidDeviceCoordinates(
  latitude: number,
  longitude: number,
): boolean {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (latitude < -90 || latitude > 90) return false;
  if (longitude < -180 || longitude > 180) return false;
  return true;
}

/**
 * 端末の現在位置を取得する。失敗時は DeviceGeolocationError を throw。
 * 戻り値を fetch / WebSocket / GeonicDB 書き込みに渡さないこと。
 */
export function requestDevicePosition(
  options: RequestDevicePositionOptions = {},
): Promise<DeviceCoordinates> {
  const geo = options.geolocation ?? globalThis.navigator?.geolocation;
  if (!geo || typeof geo.getCurrentPosition !== "function") {
    return Promise.reject(
      new DeviceGeolocationError(
        "unsupported",
        "この端末では位置情報 API を利用できません",
      ),
    );
  }

  return new Promise((resolve, reject) => {
    geo.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        if (!isValidDeviceCoordinates(latitude, longitude)) {
          reject(
            new DeviceGeolocationError(
              "invalid-coords",
              "取得した位置情報の座標が不正です",
            ),
          );
          return;
        }
        resolve({
          latitude,
          longitude,
          accuracyMeters: accuracy,
          obtainedAt: position.timestamp,
        });
      },
      (err) => {
        reject(mapPositionError(err));
      },
      {
        enableHighAccuracy: options.enableHighAccuracy ?? false,
        timeout: options.timeoutMs ?? 10_000,
        maximumAge: options.maximumAgeMs ?? 0,
      },
    );
  });
}

/**
 * 2 点間の概算距離（メートル）。端末内の距離表示用。サーバ往復を要しない。
 * Haversine 公式。
 */
export function distanceMetersBetween(
  a: Pick<DeviceCoordinates, "latitude" | "longitude">,
  b: Pick<DeviceCoordinates, "latitude" | "longitude">,
): number {
  if (
    !isValidDeviceCoordinates(a.latitude, a.longitude) ||
    !isValidDeviceCoordinates(b.latitude, b.longitude)
  ) {
    throw new DeviceGeolocationError(
      "invalid-coords",
      "距離計算に不正な座標が含まれています",
    );
  }

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const r = 6_371_000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(h)));
}
