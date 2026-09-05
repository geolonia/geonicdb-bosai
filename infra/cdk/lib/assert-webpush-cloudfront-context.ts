/**
 * Web Push 関連 context の整合チェック（bin/app.ts から利用）。
 * enableWebPush / enableWebPushCloudFront なのにプロキシ未作成、という silent misconfig を防ぐ。
 */
export function assertWebPushCloudFrontContext(opts: {
  enableWebPush: boolean;
  enableWebPushCloudFront: boolean;
  geonicdbUrlRaw?: string | null;
}): void {
  if (opts.enableWebPush && !opts.geonicdbUrlRaw?.trim()) {
    throw new Error(
      "enableWebPush=true requires -c geonicdbUrl=https://… (or NEXT_PUBLIC_GEONICDB_URL); otherwise WebPushProxyStack is not created",
    );
  }
  if (!opts.enableWebPushCloudFront) return;
  if (!opts.enableWebPush) {
    throw new Error("enableWebPushCloudFront=true requires enableWebPush=true");
  }
  // geonicdbUrl は上で enableWebPush 時に必須済み
}
