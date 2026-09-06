# セットアップ手順

`geonicdb-bosai` をフォークして自分たちの防災サイトを立ち上げるまでの手順。
概要とセールスポイントは [`../README.md`](../README.md)、デプロイ後の運用は [`deployment.md`](deployment.md) を参照。

## 1. 開発環境

Node.js **20.9.0 以上**が必要です。

```bash
npm install
test -f .env.local || cp .env.example .env.local
npm run dev
```

`http://localhost:3000` でトップページが表示されます。動的データ（緊急バナー・警戒レベル・お知らせ）は `NEXT_PUBLIC_GEONICDB_*` で指定した GeonicDB から匿名 GET します。`.env.example` の既定値は動作確認用のステージング環境を指しているため、**自治体で運用する際は必ず自分たちのテナントに差し替えてください**。

## 2. npm スクリプト

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバ |
| `npm run build` | 静的 export（`out/`） |
| `npm run lint` | ESLint |
| `npm run format` / `format:check` | Prettier |
| `npm run typecheck` | TypeScript |
| `npm test` | Vitest |
| `npm run test:a11y` | トップ主要コンポーネントの axe 検査 |
| `npm run test:cdk` | `infra/cdk` のテスト |
| `npm run lighthouse` | ビルド + Lighthouse CI（予算は `lighthouserc.js`） |
| `npm run setup:geonicdb` | XACML ポリシー・職員 API キー作成（冪等） |

## 3. 環境変数

`.env.example` に全項目とその注意書きがあります。要点:

| 変数 | 用途 | 秘密情報か |
| --- | --- | --- |
| `NEXT_PUBLIC_GEONICDB_URL` | 住民向け匿名読み取り先 | いいえ |
| `NEXT_PUBLIC_GEONICDB_TENANT` | テナント名（UUID ではない） | いいえ |
| `NEXT_PUBLIC_GEONICDB_WS_API_KEY` | WebSocket 購読用（任意） | **クライアントに露出する**（下記の制約必須） |
| `NEXT_PUBLIC_GEONICDB_WEBPUSH_API_KEY` | Web Push 購読操作用（任意） | **クライアントに露出する**（下記の制約必須） |
| `GEONICDB_URL` / `GEONICDB_TENANT` / `GEONICDB_API_KEY` | 職員向け書き込み経路（CLI・将来の管理画面） | **はい**（公開ページには使わない） |

`NEXT_PUBLIC_*` のキーはクライアントバンドルに含まれ第三者から見えます。**露出する前提で、経路ごとに最小権限のキーを分けて発行してください。**

| キー | 付与するポリシー | 権限の範囲 |
| --- | --- | --- |
| `NEXT_PUBLIC_GEONICDB_WS_API_KEY` | `bosai-read` | **読み取り専用**（GET + WS のみ。書き込みは 403） |
| `NEXT_PUBLIC_GEONICDB_WEBPUSH_API_KEY` | `bosai-webpush-proxy-write` | **購読操作専用**（subscriptions の POST/DELETE/GET + `bosai-*` の GET）。読み取り専用ではないが、**エンティティ書き込みは不可**。配信時の認可判定に対象エンティティの GET が要るため GET を含む |

どちらのキーにも次を必須とします。

- DPoP 必須（`--dpop-required`）
- オリジン限定（`--origins` にサイトの実ドメイン。`'*'` にしない）
- Web Push キーはレート制限（`rateLimit.perMinute=30`）
- エンティティを書き換えられるキー（`bosai-write` 系 / `bosai-staff-write`）は**絶対に設定しない**

未設定の場合、WS 購読はスキップされ REST の匿名読み取りのみで動作します（Web Push キー未設定なら通知オプトイン UI は表示されません）。

## 4. GeonicDB 側の準備

### 住民向け（匿名読み取り）

公開ページの **REST 取得**は SDK を `anonymous: true` で初期化し、API キーを使いません。読み取り可否はテナント側の XACML ポリシー `bosai-public-read`（`role: anonymous`、`entityType: bosai-*`、GET のみ）で制御します。

**WebSocket 購読と Web Push 購読は匿名モードでは動きません**（SDK の `connect()` はトークンを要求し、subscriptions の作成にも認可が要ります）。この 2 経路だけは上記の公開キーを使い、キーはクライアントに露出する前提で最小権限に絞ります。

### 職員向け（書き込み）

職員が `geonic` CLI / Claude Desktop MCP で書き込むためのポリシー・API キーは次で作成できます。

```bash
# 前提: geonic auth login 済み、対象テナント選択済み
npm run setup:geonicdb
```

作成した `bosai-staff-write` は `.env` の `GEONICDB_API_KEY` に設定します（公開ページには使いません）。`bosai-public-read`（匿名読み取り）の作成には `tenant_admin` 権限が必要で、権限が無い場合は警告してスキップします（手動で `geonic admin policies create`）。

ポリシー JSON・キーの命名規則・トラブルシューティングは [`geonicdb-setup.md`](geonicdb-setup.md)。エンティティの型・属性は [`data-model.md`](data-model.md)。

## 5. 自治体向けカスタマイズ

| 対象 | 編集先 |
| --- | --- |
| UI 文言・多言語 | `src/config/ui-strings.ts` / `src/config/site-language.ts`（[`i18n.md`](i18n.md)） |
| アクセシビリティ方針・試験結果の文言 | `src/config/accessibility-content.ts`（`【要記入】` を実値へ） |
| 警戒レベルの配色 | `src/config/alert-colors.ts`（内閣府公式配色） |
| 通知オン推奨バナーのつまみ | `src/config/push-opt-in-banner.ts` |
| GeonicDB 接続 | `src/config/geonicdb.ts` + 環境変数 |

## 6. アクセシビリティ対応の進め方

目標は **JIS X 8341-3:2016 適合レベル AA** および **WCAG 2.2 AA**（追加達成基準の先行対応）。根拠は障害者差別解消法（合理的配慮の提供義務）と要件 N-01〜N-08（[`spec/requirements-spec-v1.1.md`](spec/requirements-spec-v1.1.md) 5.1）。

### 同梱の公開ページ（雛形）

| パス | 内容 |
| --- | --- |
| `/accessibility/` | ウェブアクセシビリティ方針 |
| `/accessibility/test-results/` | 試験結果（JIS 附属書 JB.3.1 の表示事項） |

文言の編集は `src/config/accessibility-content.ts`。`【要記入】` を自治体の実値に置き換えてください。**試験前に「適合」と名乗らない**でください（WAIC 対応度表記ガイドライン）。

### チェックリスト・支援技術シナリオ

| ドキュメント | 用途 |
| --- | --- |
| [`a11y/wcag22-aa-checklist.md`](a11y/wcag22-aa-checklist.md) | WCAG 2.2 追加基準（N-02）と N-01〜N-08 の記入用。完全な達成基準一覧は WAIC 配布物へ委譲 |
| [`a11y/assistive-tech-scenarios.md`](a11y/assistive-tech-scenarios.md) | NVDA / VoiceOver / TalkBack の主要シナリオ |

### 導入時の流れ

1. 方針ページの対象範囲・担当部署・達成期限を更新する
2. WAIC「[試験実施ガイドライン](https://waic.jp/docs/jis2016/test-guidelines/)」に従いページを選び、手動試験と支援技術シナリオを実施する
3. チェックリストと `/accessibility/test-results/` を更新して公開する
4. 地図・PDF・動画を追加したら N-04 / N-06 / N-07 の代替提供を同じチェックリストで確認する

`npm run test:a11y` はコンポーネント単位の自動検査です。**JIS 試験の代替にはなりません**。

## 7. デプロイ

静的 export（`npm run build` → `out/`）を S3 + CloudFront 等へ配置します。CDK サンプルは `infra/cdk`。

```bash
cd infra/cdk
npm install
npx cdk deploy \
  -c certificateArn=arn:aws:acm:us-east-1:123456789012:certificate/... \
  -c domainNames=bosai.example.jp
# デプロイ後:
# aws s3 sync ../../out s3://$BUCKET --delete
# aws cloudfront create-invalidation --distribution-id $DIST_ID --paths '/*'
```

CSP・セキュリティヘッダ・TLS・キャッシュ方針・Web Push の運用注意は [`deployment.md`](deployment.md)、定期リビルドと可用性運用は [`availability-ops.md`](availability-ops.md) を参照してください。

## 付録: 通知オン推奨バナーの挙動

通知がオフの利用者にだけ、ヘッダーの上へ「通知をオンにすることをおすすめします」という帯を出します。テキストをクリックするとフッターの通知トグルへ移動し、トグル本体にフォーカスが載ります。オン・処理中・非対応・通知が許可されていない場合は出しません。

つまみは `src/config/push-opt-in-banner.ts`:

| 定数 | 既定 | 意味 |
| --- | --- | --- |
| `PUSH_OPT_IN_BANNER_DISMISS_DAYS` | `7` | 帯を閉じてから再表示するまでの日数 |

帯はヘッダーより上の**文書フロー**に入るため、差し込むとページ全体が下へずれます（アクセシビリティ方針で「固定オーバーレイは置かない」と公表しているので out-of-flow にはしません）。そのため**初回のユーザー入力（`click` / `keydown`）まで表示しません** — ずれが入力から 500ms 以内に収まり、CLS に計上されないためです。無操作タイマーでの表示は行いません（`AddToHomeScreenPrompt` の無操作タイマーは `position: fixed` + body の padding 予約が前提で「出しても何もずれない」ため成立する手であり、この帯には流用できません）。

代償として、一度も tap / キー入力しない利用者には帯が出ません。その利用者は帯が出ても通知をオンにできないため実害はなく、フッターのトグルは常設です。
