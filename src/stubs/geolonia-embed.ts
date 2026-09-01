/**
 * `@geolonia/geonicdb-sdk/react` が GeonicDbMap 経由で動的 import する
 * `@geolonia/embed` のビルド時スタブ。地図 UI は未使用のため実体は不要。
 */
/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
export class Map {
  constructor(_options?: any) {}
  on(_event: string, _handler: (...args: any[]) => void): void {}
  remove(): void {}
  fitBounds(_bounds: any, _options?: any): void {}
}

export class Marker {
  constructor(_options?: any) {}
  setLngLat(_lngLat: any): this {
    return this;
  }
  setPopup(_popup: any): this {
    return this;
  }
  addTo(_map: any): this {
    return this;
  }
  remove(): void {}
}

export const geolonia = {};
