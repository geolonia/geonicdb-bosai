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

Web Push 登録プロキシ（#35）を有効にする:

```bash
npx cdk deploy \
  -c enableWebPush=true \
  -c geonicdbUrl=https://geonicdb.geolonia.com \
  -c geonicdbTenant=miya \
  -c siteOrigin=https://bosai.example.jp
# デプロイ後: Secrets Manager に GEONICDB_API_KEY を投入
# フロント: NEXT_PUBLIC_WEBPUSH_REGISTER_URL=/api/webpush
```
