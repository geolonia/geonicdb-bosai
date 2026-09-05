/**
 * enableWebPushCloudFront と必須 context の整合チェック（bin/app.ts から利用）。
 * CloudFront 配線なのにプロキシ未作成、という silent misconfig を防ぐ。
 */
export function assertWebPushCloudFrontContext(opts: {
  enableWebPush: boolean;
  enableWebPushCloudFront: boolean;
  geonicdbUrlRaw?: string | null;
}): void {
  if (!opts.enableWebPushCloudFront) return;
  if (!opts.enableWebPush) {
    throw new Error("enableWebPushCloudFront=true requires enableWebPush=true");
  }
  if (!opts.geonicdbUrlRaw?.trim()) {
    throw new Error(
      "enableWebPushCloudFront=true requires -c geonicdbUrl=https://… (or NEXT_PUBLIC_GEONICDB_URL); otherwise WebPushProxyStack and /api/webpush behavior are not created",
    );
  }
}
