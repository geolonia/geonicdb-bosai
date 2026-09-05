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

Web Push 登録プロキシ（#35）を有効にする（#36: WAFv2 レート制限付き）:

```bash
# enableWebPush=true のとき GeonicdbBosaiWebAcl（us-east-1）と
# GeonicdbBosaiSite（サイトリージョン）の 2 スタックが合成される。
# CLOUDFRONT-scoped WAFv2 は us-east-1 でのみ作成可能なため分離している（ACM と同型）。
npx cdk deploy --all \
  -c enableWebPush=true \
  -c geonicdbUrl=https://geonicdb.geolonia.com \
  -c geonicdbTenant=miya \
  -c siteOrigin=https://bosai.example.jp
# siteOrigin は CORS 用に必須（* は不可）
# デプロイ後: Secrets Manager に GEONICDB_API_KEY を投入
# フロント: NEXT_PUBLIC_WEBPUSH_REGISTER_URL=/api/webpush （CloudFront 同一オリジン必須。
#           Function URL 直叩きは WAF 対象外のため reserved concurrency のみが効く）
```

### Web Push レート制限（#36）

| 層                                    | 内容                                                                                          | 根拠                                          |
| ------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------- |
| WAFv2 rate-based（CloudFront）        | `/api/webpush*` に ScopeDown。**IP あたり 5 分で 120 req** 超で Block。他パスは Default Allow | 正当な購読/解除の再試行を通しつつ量産を抑える |
| Lambda `reservedConcurrentExecutions` | **5**                                                                                         | Function URL 直叩きへの defense-in-depth      |

定数: `lib/webpush-limits.ts`。WebACL スタック: `lib/webpush-web-acl-stack.ts`。
