# geonicdb-bosai

**自治体の防災サイト／ハザードマップアプリを、フォークして自分たちのデータを差すだけで立ち上げるためのテンプレート。**

避難所・ハザードマップ・警戒レベルといった「災害時にアクセスが集中し、絶対に落とせない情報」を、静的配信の堅さとリアルタイム更新の速さの両取りで届けます。バックエンドは [GeonicDB](https://github.com/geolonia/geonicdb)（NGSI-LD Context Broker）。フロントは Next.js の静的 export。

- デモ／プレビュー: <https://geolonia.github.io/geonicdb-bosai/>
- ライセンス: **未定**（`LICENSE` 未設置）。フォーク・再配布の条件は決まり次第ここに明記します

---

## なぜこのテンプレートか

### 1. データベースが止まっても、サイトは落ちない

主要情報（緊急バナー・警戒レベル・お知らせ）は**ビルド時に GeonicDB から取得して静的 HTML へ焼き込みます**。住民の初期表示に API 通信は要りません。

| 状況                            | 住民に見えるもの                                                                                          |
| ------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 通常時                          | ビルド時の値を即表示 → WebSocket / REST で最新値へ差し替え                                                |
| JS 無効・古い端末               | ビルド時の値がそのまま表示される                                                                          |
| GeonicDB 停止（閲覧中）         | **直近に成功したビルドの値**が表示され続ける                                                              |
| GeonicDB 停止（定期リビルド中） | 取得全滅ならビルドを失敗させ deploy をスキップ。CDN 上の前回成果物を空データで上書きしない（fail-closed） |

「この情報は HH:MM 時点」という鮮度表示も組み込み済みです。取得失敗時に試行時刻を最終取得と偽ることはしません。

### 2. 更新は即座に届く — WebSocket とプッシュ通知

- 画面を開いている住民には **WebSocket** で緊急バナー・警戒レベル・お知らせを即時反映
- 画面を閉じている住民には **Web Push**（警戒レベルの変更時のみ、購読者の表示言語に絞って配信）
- **中間サーバー不要**。静的ホスティングと GeonicDB の 2 者だけで完結します（Lambda もプロキシも置きません）
- PWA としてホーム画面に追加でき、iOS の Badging API によるバッジ表示にも対応

### 3. 職員向け管理画面を作らなくていい

コンテンツ更新は `geonic` CLI や Claude Desktop（MCP）から GeonicDB の NGSI-LD API を直接叩く運用です。CMS の構築・運用・脆弱性対応が丸ごと不要になります。

権限は XACML ポリシーでサーバー側に寄せ、経路ごとに別のキーを使います。

| 経路                  | キー                                                                                                                       | クライアントへの露出                                          |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 住民の REST 読み取り  | なし（SDK を `anonymous: true` で初期化）                                                                                  | —                                                             |
| 住民の WebSocket 購読 | 読み取り専用（`bosai-read`。GET + WS のみ）                                                                                | **意図的に露出**。DPoP 必須 + オリジン限定が前提              |
| 住民の Web Push 購読  | 購読操作専用（`bosai-webpush-proxy-write`。subscriptions の POST/DELETE/GET + `bosai-*` の GET。エンティティ書き込み不可） | **意図的に露出**。DPoP 必須 + オリジン限定 + レート制限が前提 |
| 職員の書き込み        | `bosai-staff-write`                                                                                                        | **絶対に埋め込まない**（サーバー／手元の CLI のみ）           |

つまり公開ページに載るのは「読めるだけ・購読できるだけ」のキーに限られ、エンティティを書き換えられるキーはクライアントに一切出しません。

### 4. アクセシビリティが「後付け」でない

- 目標は **JIS X 8341-3:2016 適合レベル AA** および **WCAG 2.2 AA**（改正の先取り）
- ウェブアクセシビリティ方針・試験結果ページ（JIS 附属書 JB.3.1 の表示事項）の**雛形が同梱**。文言を差し替えるだけで公開できます
- 色だけに依存しない警戒レベル表示（内閣府公式配色 + 数字 + 文言の併記）、`role="alert"` / `aria-live` の使い分け
- `npm run test:a11y` で axe による自動検査、CI で Lighthouse のアクセシビリティスコアをブロック条件に設定済み

### 5. セキュリティとパフォーマンスの目標値が最初から入っている

- CSP は `default-src 'none'` 起点の固定ヘッダ。`'unsafe-inline'` / `'unsafe-eval'` なし（インライン script はビルド後に外部化し、残っていれば **ビルドを失敗させる**）
- HSTS / `X-Content-Type-Options` / `X-Frame-Options` / `Referrer-Policy` / `Permissions-Policy` / COOP / CORP を Response Headers Policy で送出
- TLS 1.2_2021 以上、ACM 証明書、OCSP Stapling — **Mozilla Observatory A+ / SSL Labs A+ を狙える CDK スタックを同梱**（`infra/cdk`）
- 災害時トップの HTML ≤ 50KB・CSS ≤ 30KB を CI の **error** 閾値として強制。1 ページ 1.6〜3MB 予算（東京都ガイドライン）

### 6. 多言語 5 言語

日本語 / 英語 / 中国語（簡体字）/ ベトナム語 / 韓国語。UI 文言だけでなく、動的コンテンツも GeonicDB 側の `language` プロパティで言語別に取得します。`lang` 属性の切替、`localStorage` への選好保存込み。

### 7. どこにでも置ける

`output: 'export'` による完全静的エクスポート。S3 + CloudFront、GitHub Pages、その他どの静的ホスティングでも動きます。Node 実行環境は不要です。

---

## 5 分で動かす

Node.js **20.9.0 以上**。

```bash
npm install
test -f .env.local || cp .env.example .env.local
npm run dev
```

`http://localhost:3000` でトップページが表示されます。`.env.example` の既定値は動作確認用のステージング環境を指しています（運用時は必ず自分たちのテナントへ差し替えます）。

自分のテナント・自治体データに差し替える手順は [`docs/setup.md`](docs/setup.md) を参照してください。

---

## 収録済みの機能

- 緊急バナー（重大度バリアント + 内閣府配色、常時領域確保）
- 警戒レベル 1〜5 表示（色 + 数字 + 文言）
- 新着・お知らせ一覧（更新日時の明示）
- クイックリンク 4 カード（デジタル庁の 4 局面）
- 多言語 5 言語切替（`ja` / `en` / `zh-CN` / `vi` / `ko`）
- Web Push 通知 + PWA（ホーム画面追加・バッジ）
- アクセシビリティ方針 / 試験結果ページの雛形
- CloudFront セキュリティヘッダ・TLS の CDK スタック

要件の全体像は [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md)、進行中の開発は [Issues](https://github.com/geolonia/geonicdb-bosai/issues) を参照してください。

---

## ドキュメント

### 導入・運用

| ドキュメント                                           | 内容                                                                               |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| [`docs/setup.md`](docs/setup.md)                       | **セットアップ手順**（開発環境・環境変数・npm スクリプト・自治体向けカスタマイズ） |
| [`docs/geonicdb-setup.md`](docs/geonicdb-setup.md)     | GeonicDB 側の XACML ポリシー・API キー作成                                         |
| [`docs/deployment.md`](docs/deployment.md)             | デプロイ・CDN キャッシュ・CSP・TLS・Web Push の運用                                |
| [`docs/availability-ops.md`](docs/availability-ops.md) | 定期リビルド・最終公開状態の維持・負荷試験                                         |
| [`docs/security-ops.md`](docs/security-ops.md)         | プライバシー・依存更新のセキュリティ運用                                           |
| [`docs/a11y/README.md`](docs/a11y/README.md)           | アクセシビリティ試験の進め方・チェックリスト                                       |

### 仕様

| ドキュメント                                                                 | 内容                                             |
| ---------------------------------------------------------------------------- | ------------------------------------------------ |
| [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md)                               | 要件定義（目的・アーキテクチャ・MVP スコープ）   |
| [`docs/spec/requirements-spec-v1.1.md`](docs/spec/requirements-spec-v1.1.md) | 要件仕様書 BOUSAI-WEB-SPEC-001                   |
| [`docs/pages/top-page.md`](docs/pages/top-page.md)                           | トップページ仕様                                 |
| [`docs/data-model.md`](docs/data-model.md)                                   | NGSI-LD エンティティのデータモデル               |
| [`docs/i18n.md`](docs/i18n.md)                                               | 多言語対応仕様                                   |
| [`docs/frontend-best-practices.md`](docs/frontend-best-practices.md)         | フロントエンド実装方針                           |
| [`docs/research/guidelines.md`](docs/research/guidelines.md)                 | 国内外の防災サイトガイドライン調査（設計の出典） |

---

## アーキテクチャ（1 枚図）

```text
[職員]                      [GeonicDB]                    [ビルド / CDN]        [住民のブラウザ]
  |  NGSI-LD Entity 更新        |                                |                      |
  |  (geonic CLI /              |  ビルド時スナップショット ---->  |  静的 HTML へ埋込      |
  |   Claude Desktop MCP) --->  |  （匿名 GET）                   |  （定期リビルド）      |
  |  bosai-staff-write          |                                |                      |
  |                            |  WebSocket / REST 差分 <--------|----------------------|
  |                            |  bosai-public-read で GET 許可   |  初期表示は埋込値      |
  |                            |  Web Push（警戒レベル変更時）      |  失敗時も埋込値を維持   |
```

詳細は [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) 2.1 節。

---

## コントリビュート

作業は必ず git worktree を切って行います（[`CLAUDE.md`](CLAUDE.md)）。issue には優先度ラベル（`Priority: Emerg/High/Middle/Low`）を必ず付けてください。
