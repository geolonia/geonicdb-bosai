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
