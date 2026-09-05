# geonicdb-bosai CDK（S3 + CloudFront + Web Push プロキシ）

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

## Web Push プロキシ（#35 / #36）— GitHub Pages 向け単体デプロイ

**本リポジトリのプレビューは GitHub Pages**（`.github/workflows/deploy-pages.yml`）。
S3+CloudFront（`GeonicdbBosaiSite`）は必須ではない。

`GeonicdbBosaiWebPushProxy` だけをデプロイし、出力の Function URL を
`NEXT_PUBLIC_WEBPUSH_REGISTER_URL` に設定すれば、ブラウザから直接購読登録できる。
CORS は `-c siteOrigin=` に GitHub Pages の origin（例: `https://<org>.github.io`）を渡す。

### ステージング単体デプロイ例（アカウント `705008887115` / `ap-northeast-1`）

```bash
cd infra/cdk
npm install

# アカウント ID をシェルに載せる（未設定だと aws:///region になり bootstrap が失敗する）
export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
# ステージング固定例: export CDK_DEFAULT_ACCOUNT=705008887115

# サイトリージョンのみ bootstrap（WAF/us-east-1 は不要）
npx cdk bootstrap aws://$CDK_DEFAULT_ACCOUNT/ap-northeast-1

# 必須 context のみ（これだけでデプロイ可能）
npx cdk deploy GeonicdbBosaiWebPushProxy \
  -c enableWebPush=true \
  -c geonicdbUrl=https://geonicdb.geolonia.com \
  -c geonicdbTenant=miya \
  -c siteOrigin=https://geolonia.github.io

# 任意オプションを付ける場合（行末 \ の直後にコメントを置かない）:
# npx cdk deploy GeonicdbBosaiWebPushProxy \
#   -c enableWebPush=true \
#   -c geonicdbUrl=https://geonicdb.geolonia.com \
#   -c geonicdbTenant=miya \
#   -c siteOrigin=https://geolonia.github.io \
#   -c geonicdbApiKeySecretArn=arn:aws:secretsmanager:ap-northeast-1:705008887115:secret:... \
#   -c bosaiContextUrl=https://geolonia.github.io/geonicdb-bosai/ngsi-ld/bosai-context.jsonld

# デプロイ後:
# 1. Secrets Manager に GEONICDB_API_KEY（平文 or JSON { "apiKey": "..." }）を投入
# 2. スタック出力 WebPushRegisterUrl を控える
# 3. GitHub Actions / ローカル build で:
#      NEXT_PUBLIC_WEBPUSH_REGISTER_URL=<Function URL>
#      NEXT_PUBLIC_GEONICDB_URL=https://geonicdb.geolonia.com
#    （CSP connect-src 用に -c webPushRegisterUrl=<同 URL> をサイト synth に渡してもよい）
```

| context / 環境変数                               | 必須                | 説明                                                                             |
| ------------------------------------------------ | ------------------- | -------------------------------------------------------------------------------- |
| `enableWebPush`                                  | はい                | `true` で `GeonicdbBosaiWebPushProxy` を合成                                     |
| `geonicdbUrl` / `NEXT_PUBLIC_GEONICDB_URL`       | はい                | GeonicDB base URL                                                                |
| `siteOrigin` / `NEXT_PUBLIC_SITE_ORIGIN`         | はい（Web Push 時） | CORS Allow-Origin（GitHub Pages origin 可。`*` 不可）                            |
| `geonicdbTenant` / `NEXT_PUBLIC_GEONICDB_TENANT` | 任意                | Fiware-Service                                                                   |
| `geonicdbApiKeySecretArn`                        | 任意                | 既存シークレット ARN。未指定時は新規作成                                         |
| `bosaiContextUrl`                                | 任意                | NGSI-LD Link ヘッダ用 context URL                                                |
| `webPushRegisterUrl`                             | 任意                | サイト側 CSP `connect-src` に Function URL origin を足すとき                     |
| `enableWebPushCloudFront`                        | 任意                | `true` で CloudFront `/api/webpush` + WAFv2（フル CDK 向け。`geonicdbUrl` 必須） |

### フル CDK（CloudFront + WAF）デプロイ

本番で S3+CloudFront も使う場合のみ。WAF は **CloudFront 経由の `/api/webpush*` にだけ**効く追加防御。
**`reservedConcurrentExecutions: 50` は常時有効。** フル CDK でも Function URL は公開のまま残るため、
直接叩きは WAF を迂回する（推奨: `NEXT_PUBLIC_WEBPUSH_REGISTER_URL=/api/webpush` とし Function URL を埋め込まない）。
直叩き拒否（OAC / 共有シークレット）や Function URL 側の持続的レート制限は **follow-up**。

```bash
export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)

npx cdk bootstrap aws://$CDK_DEFAULT_ACCOUNT/ap-northeast-1
npx cdk bootstrap aws://$CDK_DEFAULT_ACCOUNT/us-east-1   # WAF / crossRegionReferences 用

npx cdk deploy --all \
  -c enableWebPush=true \
  -c enableWebPushCloudFront=true \
  -c geonicdbUrl=https://geonicdb.geolonia.com \
  -c geonicdbTenant=miya \
  -c siteOrigin=https://bosai.example.jp
# 推奨: NEXT_PUBLIC_WEBPUSH_REGISTER_URL=/api/webpush
```

### レート制限の層

| 層                                        | いつ効くか                                        | 内容                                                                                  |
| ----------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Lambda `reservedConcurrentExecutions: 50` | **常時**（プロキシスタック）                      | 同時実行の粗い上限。Function URL 直叩きにも効くが、時系列量産の主防御ではない         |
| WAFv2 rate-based                          | `enableWebPushCloudFront=true` のフルデプロイのみ | CloudFront `/api/webpush*` に IP あたり 5 分 120。**Function URL 直叩きには効かない** |

定数: `lib/webpush-limits.ts`。プロキシ: `lib/webpush-proxy-stack.ts`。WAF: `lib/webpush-web-acl-stack.ts`。
