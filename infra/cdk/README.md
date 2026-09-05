# geonicdb-bosai CDK（S3 + CloudFront）

本番想定の配信基盤サンプル。Response Headers Policy で仕様 5.8.2 のセキュリティヘッダを送出する。

詳細はリポジトリ直下の [`docs/deployment.md`](../../docs/deployment.md) を参照。

```bash
cd infra/cdk
npm install
npx cdk synth
# 要 AWS 資格情報
npx cdk deploy
```

Report-Only で初回検証する場合:

```bash
npx cdk deploy -c cspReportOnly=true -c cspReportUri=https://example.com/csp-report
```

GeonicDB が別オリジンのとき（`connect-src` に追加）:

```bash
npx cdk deploy -c geonicdbUrl=https://geonicdb.example.jp
# または NEXT_PUBLIC_GEONICDB_URL を export してから cdk deploy
```

## Web Push（#39）

**中間サーバーは不要。** Web Push は gh-pages（または本スタックで配信する静的アセット）と
GeonicDB の 2 者で完結する。ブラウザが SDK（DPoP 付き API キー）で
`/ngsi-ld/v1/subscriptions` へ直接登録する。Lambda Function URL / CloudFront `/api/webpush` /
WAFv2 は撤去済み。

CSP では `connect-src` に GeonicDB オリジン、`worker-src 'self'`（Service Worker）を付与する。
