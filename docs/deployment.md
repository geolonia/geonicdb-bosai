# デプロイ・キャッシュ方針

作成日: 2026-09-01
更新: 2026-09-02（issue #6: CloudFront セキュリティヘッダ / TLS）
関連: [`frontend-best-practices.md`](frontend-best-practices.md)、[`REQUIREMENTS.md`](REQUIREMENTS.md) 2.2、[`spec/requirements-spec-v1.1.md`](spec/requirements-spec-v1.1.md) 5.8

静的 export（`next build` → `out/`）を CDN / オブジェクトストレージ等で配信する前提の指針。

## 配信環境の役割分担

| 環境 | 用途 | HTTP カスタムヘッダ | Observatory A+ |
|---|---|---|---|
| **S3 + CloudFront** | 本番想定 | Response Headers Policy で送出 | 対象（MUST） |
| GitHub Pages | 開発・プレビュー | 設定不可 | **対象外**（達成不可能） |

試験環境と本番でヘッダ・TLS 設定を同一に保つため、設定は IaC で管理する（N-420 / 5.8.5）。サンプル: [`infra/cdk`](../infra/cdk)。

## Cache-Control

| 対象 | 推奨 |
|---|---|
| ハッシュ付き JS/CSS（`/_next/static/**`） | `public, max-age=31536000, immutable` |
| HTML（`*.html` / `/`） | 短 TTL（例: `public, max-age=60, must-revalidate`）または CDN で即時無効化可能に |
| GeonicDB NGSI-LD 応答（ブラウザからの差分取得） | GeonicDB / CDN のキャッシュ方針に従う。初期表示はビルド時スナップショット（`REQUIREMENTS.md` 2.1） |

CloudFront ではパスパターン別に Cache Policy を分ける（HTML と `/_next/static/*`）。Response Headers Policy のセキュリティヘッダとは別に設定する。

**本リポジトリの CDK サンプル（`infra/cdk`）は Response Headers Policy / TLS / オリジン配線までを対象とし、パス別 Cache Policy（`additionalBehaviors`）は未実装。** HTML 短 TTL と `/_next/static/*` の長期キャッシュは、デプロイ担当が CloudFront コンソールまたは CDK を拡張して設定すること（issue #6 のヘッダ・TLS スコープ外）。

## 画像

`next.config.ts` で `images.unoptimized: true`（静的 export 制約）。画像を追加する場合:

- 事前に WebP / AVIF へ変換する
- ビューポート外は `loading="lazy"`（LCP 候補は eager）
- 大きなヒーロー画像は避ける（1ページ 1.6〜3MB 予算）

## コード分割

ルート単位は App Router のファイル分割に任せる。重いクライアント専用 UI は `next/dynamic` で遅延読み込みする（現状クイックリンク先は未実装のため未使用）。

## Lighthouse 予算のローカル確認

```bash
npm run build
npm run lighthouse
```

仕様 5.8.4（災害時トップ）: HTML ≤ 50KB・CSS ≤ 30KB は **error**（CI ブロック）。JS ≤ 100KB・合計 ≤ 500KB は当面 **warn**（現状 Next.js クライアントランタイムが JS 予算を超過）。4 カテゴリは目標 100（`minScore: 1`）。performance / accessibility / seo は **error**、best-practices は実測 0.96 のため当面 **warn**。閾値は `lighthouserc.js`。CI（`.github/workflows/ci.yml`、#9）でも同設定を `lhci autorun` する（`numberOfRuns=3` + median）。

## Content-Security-Policy（5.8.2）

### 設計

静的 export ではリクエスト毎の nonce が使えない。また `out/*.html` には nonce / integrity を持たない **parser-inserted な外部 chunk `<script>`** が複数あり、CSP に `'strict-dynamic'` を付けるとこれらがすべてブロックされてサイトが壊れる。

そのため本テンプレートでは:

1. **postbuild**（`scripts/externalize-inline-scripts.mjs`）で src 無しのインライン JS `<script>` を `out/_next/csp-inline/<hash>.js` に書き出し、`<script src="...">` に置換する（`async` / `defer` は付けない）。JSON-LD 等のデータブロックは対象外。置換後にインライン JS が残っていれば **exit 1**。
2. CloudFront には **固定 CSP** を載せる（ビルド毎の hash 差し替えパイプラインは持たない）。

既定 CSP（強制）:

```text
default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests
```

**仕様 5.8.2 の括弧書き「nonce または hash と `'strict-dynamic'`」は字義どおりには満たさない**が、検証可能な MUST 要件（HTTP ヘッダでの送出、`default-src 'none'` 起点、`'unsafe-inline'` / `'unsafe-eval'` / ワイルドカード禁止、`object-src` / `base-uri` / `frame-ancestors` / `form-action` / `upgrade-insecure-requests`）はすべて満たす、という解釈とする（課長裁可済み・issue #6）。

**本番で GeonicDB が別オリジンの場合**は `connect-src` にそのオリジンを足す（CDK: `-c geonicdbUrl=https://…` または `NEXT_PUBLIC_GEONICDB_URL`。`cspExtras.connectSrc`）。未設定のままだと `connect-src 'self'` のみでクロスオリジン API がブロックされる。

組み立ては `infra/cdk/lib/csp-policy.ts`。`connectSrc` / `imgSrc` / `workerSrc` / `childSrc` 等に **追加ホストを props で渡せる**。**`scriptSrc` への追加ホスト prop は用意しない**（Geolonia Maps は npm バンドルで自ホスト配信の設計のため不要、という理解。**#3 着手時に再確認すること**）。

### 段階移行（仕様の Report-Only MUST）

初回デプロイおよび CSP 変更時（#3 で Geolonia Maps ドメインを足す場合を含む）:

1. `cspReportOnly: true` と `cspReportUri` を設定してデプロイ（CDK context 例: `-c cspReportOnly=true -c cspReportUri=https://…`）
2. 違反がゼロであることを確認
3. `cspReportOnly: false` に flip して強制 CSP へ

report 収集先は **外部の CSP レポートサービス**、または **Lambda Function URL** 等を選べる。収集基盤そのものの実装は本 issue（#6）のスコープ外。

### #3（ハザードマップ）で足す想定

- `worker-src 'self' blob:`
- `child-src blob:`
- `img-src` / `connect-src` へのタイル・スタイル・フォント配信ホスト追加

`script-src` への外部ホスト追加は、上記の自ホスト前提が崩れる場合のみ。#3 着手時に確認する。

## その他のセキュリティヘッダ（Response Headers Policy）

| ヘッダ | 値 |
|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), payment=(), usb=(), interest-cohort=(), geolocation=(self)` |
| `Cross-Origin-Resource-Policy` | `same-origin` |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `X-XSS-Protection` | **送出しない** |

実装: `infra/cdk/lib/bosai-site-stack.ts`。

## TLS（SSL Labs A+ / 5.8.3）

| 項目 | 設定 |
|---|---|
| プロトコル | CloudFront Security Policy **TLSv1.2_2021 以上**（TLS 1.0/1.1 無効） |
| 証明書 | ACM（**us-east-1**）の公的 CA 証明書をビューワー証明書に付与。自動更新 |
| OCSP Stapling | CloudFront が有効化 |
| HTTP → HTTPS | `ViewerProtocolPolicy: redirect-to-https`（同一ホスト 301） |
| CAA | Route 53（または DNS プロバイダ）で `0 issue "amazon.com"` 等を設定（SHOULD） |
| DNSSEC | Route 53 でホストゾーンの DNSSEC 署名を有効化（SHOULD） |

**注意:** CloudFront 既定証明書（`*.cloudfront.net`）のままでは Security Policy を TLSv1.2_2021 にできない（CDK も警告する）。SSL Labs A+ には `certificateArn` + `domainNames` を渡すこと。

```bash
npx cdk deploy \
  -c certificateArn=arn:aws:acm:us-east-1:123456789012:certificate/... \
  -c domainNames=bosai.example.jp
```

CAA / DNSSEC は独自ドメイン接続後に DNS 側で設定する。

## Web Push 購読プロキシとレート制限（#35 / #36）

**GitHub Pages 運用が既定。** Web Push は `GeonicdbBosaiWebPushProxy`（Lambda Function URL）を
**単体デプロイ**し、ブラウザから Function URL を直接呼べば動作する。CloudFront / WAF は
本番向けの追加ハードニングであり **必須ではない**。

| スタック | 役割 | いつ使うか |
|---|---|---|
| `GeonicdbBosaiWebPushProxy` | Lambda + Function URL + Secrets | `enableWebPush=true`（GitHub Pages でも必須） |
| `GeonicdbBosaiWebAcl`（us-east-1） | WAFv2 rate-based | `enableWebPushCloudFront=true` のフル CDK のみ |
| `GeonicdbBosaiSite` | S3 + CloudFront。任意で `/api/webpush` → プロキシ | フル CDK 配信時。Pages では未デプロイでよい |

- **WAF** は CloudFront に関連付けるものなので、フル CDK デプロイ時のみ有効（`/api/webpush*`）。
- **`reservedConcurrentExecutions: 50` は常時有効**（プロキシ Lambda）。同時実行の粗い上限であり、時系列のリクエスト量そのものは制限しない。
- **残存リスク（フル CDK でも）:** Function URL 自体は公開のまま残るため、直接叩きは **CloudFront WAF を迂回する**。推奨はフロントを `/api/webpush`（同一オリジン）に向け、Function URL をブラウザに埋め込まないこと。OAC / 共有シークレットによる直叩き拒否は **本 issue スコープ外（follow-up）**。
- CORS は `-c siteOrigin=`（GitHub Pages の HTTPS origin 可。`*` 不可）。

### 単体デプロイ例（ステージング）

詳細な context 一覧・コマンドは [`infra/cdk/README.md`](../infra/cdk/README.md) を参照。

```bash
cd infra/cdk
export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
# ステージング固定例: export CDK_DEFAULT_ACCOUNT=705008887115
npx cdk bootstrap aws://$CDK_DEFAULT_ACCOUNT/ap-northeast-1
npx cdk deploy GeonicdbBosaiWebPushProxy \
  -c enableWebPush=true \
  -c geonicdbUrl=https://geonicdb.geolonia.com \
  -c geonicdbTenant=miya \
  -c siteOrigin=https://geolonia.github.io
# 出力 WebPushRegisterUrl → NEXT_PUBLIC_WEBPUSH_REGISTER_URL
# Secrets Manager に GEONICDB_API_KEY を投入
```

### フル CDK（CloudFront + WAF）

```bash
export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
npx cdk bootstrap aws://$CDK_DEFAULT_ACCOUNT/ap-northeast-1
npx cdk bootstrap aws://$CDK_DEFAULT_ACCOUNT/us-east-1
npx cdk deploy --all \
  -c enableWebPush=true \
  -c enableWebPushCloudFront=true \
  -c geonicdbUrl=https://geonicdb.geolonia.com \
  -c siteOrigin=https://bosai.example.jp
# 推奨: NEXT_PUBLIC_WEBPUSH_REGISTER_URL=/api/webpush
```

## CDK の使い方（要約）

```bash
cd infra/cdk
npm install
npx cdk synth
npx cdk deploy
# 静的ファイルの同期例（デプロイ後）:
# aws s3 sync ../../out s3://$BUCKET --delete
# aws cloudfront create-invalidation --distribution-id $DIST_ID --paths '/*'
```

## 監査結果の公開（5.8.5 SHOULD）

Lighthouse レポート（`.lighthouseci`）や Observatory / SSL Labs のスコアへのリンクを、アクセシビリティ方針ページ（`/accessibility/`）から辿れるようにする運用を推奨する。自動スキャンの通知パイプラインはデプロイ先アカウント側で設定する。

## 可用性・負荷試験

災害時の最終公開状態維持・定期リビルド・負荷試験／監視の手順は [`availability-ops.md`](availability-ops.md) を参照。
