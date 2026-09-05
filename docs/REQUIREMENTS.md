# geonicdb-bosai 要件定義書

作成日: 2026-09-01
対象: 自治体向け防災サイト テンプレートリポジトリ `geonicdb-bosai`

本書は `docs/research/guidelines.md`（国内外の防災サイトガイドライン調査）に基づき、実装に落とすための要件・アーキテクチャ・スコープを定義する。

---

## 1. プロダクトの目的

自治体が最小限のカスタマイズで導入できる、防災サイトの**テンプレートリポジトリ**を提供する。単体の防災サイト実装ではなく、他の自治体がフォーク/クローンして自分たちの避難所データ・ハザードマップ・配色を差し込めば動く「型」を作ることが目的。

- 一次読者: 住民（平時・災害時両方）
- 二次読者: 自治体職員（コンテンツ更新・災害時モード切替の運用者）
- ライセンス/公開方針: `geolonia/geonicdb-bosai` として **public** リポジトリで公開

## 2. アーキテクチャ方針

### 2.1 バックエンド: ビルド時スナップショット + クライアント差分更新（2026-09-02 改訂）

**方針（issue #9 / N-10）**: 災害時トップ等の主要情報は **ビルド時に GeonicDB から取得して静的 HTML へ焼き込む**。住民のブラウザは初期表示に GeonicDB を必要としない。差分の反映だけを `@geolonia/geonicdb-sdk` の React hooks（`useLdEntities`）と WebSocket 購読（`useBosaiLiveUpdates`）が担う。これにより N-10（CMS・DB 停止時も最終公開状態を維持）と N-30（プログレッシブエンハンスメント）を両立する。

```text
[職員]                     [GeonicDB]                         [ビルド / CDN]          [住民のブラウザ]
  |  NGSI-LD Entity更新       |                                     |                        |
  |  (geonic CLI /            |  fetchBosaiStaticSnapshot() ------->|  静的 HTML に埋込        |
  |   Claude Desktop MCP) -->  |  （anonymous GET）                  |  （定期リビルド含む）     |
  |  bosai-write ポリシー      |                                     |                        |
  |                           |  useLdEntities / WS 購読 <----------|------------------------|
  |                           |      bosai-public-read で GET 許可   |  初期表示は埋込値        |
  |                           |      （差分更新・N-14）              |  失敗時も埋込値を維持    |
```

| 状況 | 表示 |
|---|---|
| 通常時 | ビルド時の値を即座に表示 → WS / REST で最新値へ差し替え |
| JS 無効・古いブラウザ | ビルド時の値が表示される |
| GeonicDB 停止（閲覧時） | **直近に成功したビルド**の埋込値が表示され続ける（N-10） |
| GeonicDB 停止（定期リビルド時） | スナップショット全滅なら **build 失敗 → deploy スキップ**。CDN 上の前回成功成果物は上書きされない |
| ビルド後にデータ更新 | WS で即時反映（N-14） |

- **職員側（書き込み）**: GeonicDB の NGSI-LD API を `geonic` CLI や Claude Desktop（MCP）経由で直接操作する。`bosai-write` ポリシー + `bosai-staff-write` APIキーを使用（`docs/geonicdb-setup.md`）。職員向け管理画面（Web UI）は当面実装しない（`REQUIREMENTS.md` 5節）。
- **住民側（読み取り）**: 初期 HTML はビルド時スナップショット。ライブ更新用 SDK は **匿名モード（`anonymous: true`）**（REST）および読み取り専用 WS キー（任意）。読み取り可否はサーバー側の XACML ポリシー `bosai-public-read` で制御する。`NEXT_PUBLIC_GEONICDB_URL` / `NEXT_PUBLIC_GEONICDB_TENANT` は秘密情報ではない。
- **鮮度の明示（F-45）**: ビルド時の値を表示している間は「この情報は HH:MM 時点」と必ず明示する。取得失敗時は、**成功した最終取得時刻が分かる場合のみ**「情報を取得できません（最終取得 HH:MM）」とし、無ければ汎用の読み込みエラー文言にする（試行失敗時刻を最終取得と偽らない）。リソース単位で独立させ、1 つの失敗が他を巻き込まない。
- **全滅時の fail-closed**: 成功リソースが 0 のスナップショットは `assertBosaiStaticSnapshotDeployable` でビルドを失敗させ、定期リビルドが空 HTML で前回公開を上書きしないようにする。
- **実装の入口**: `src/lib/fetch-bosai-static-snapshot.ts`（ビルド時）、`src/lib/resolve-bosai-resource-view.ts`（ライブとの合成）、`src/app/page.tsx` → `TopPage` の `initialSnapshot`。緊急バナー・警戒レベル・お知らせは同じパターン。言語切替時は埋込スナップショットの言語キーを使い、ライブ側は `q: 'language=="<lang>"'` で再フェッチする。
- **避難所など未実装ページ**: 同じ `fetchBosaiStaticSnapshot` / `resolveBosaiResourceView` パターンを拡張して焼き込む（詳細は `docs/availability-ops.md`）。ページ自体の実装は別 issue（#2 等）。

### 2.2 フロントエンド技術スタック: Next.js

選定理由:
- **完全静的エクスポート（`output: 'export'`）** を前提にでき、ISR・サーバーランタイムが不要になったことで S3+CloudFront を含む任意の静的ホスティングにそのままデプロイできる
- 職員向け管理画面（GeonicDB への書き込みUI）を同一リポジトリ内に実装でき、フロントと管理画面を1スタックに収められる（管理画面側は認証が必要なため、静的export対象からは分離する）
- `geonicdb-pulse` / `geonicdb-voice` と同様に `@geolonia/geonicdb-sdk` を利用でき、GeonicDB エコシステムのベストプラクティスを踏襲しやすい
- Astro は静的コンテンツに強いが、認証付き管理画面・リアルタイム連携を同じ強度で持たせるには Next.js の方が実績のある選択

デプロイ想定: **住民向け公開サイトは完全静的ファイルとして S3+CloudFront 等どのホスティングにも配置可能**（Vercel等のNode実行環境は不要）。職員向け管理画面は別途Node実行環境（Vercel等）または別リポジトリ/別デプロイ単位として切り出すことを許容する。

## 3. 機能要件（MVP スコープ）

`guidelines.md` 3.1 のチェックリストから、**テンプレートの初期リリースに含める [必須] 項目**を以下に絞る。[推奨]/[任意] は初期リリース後の issue とする。

| # | 機能 | 出典 |
|---|---|---|
| 1 | 緊急バナー（見出し/短い説明/リンク1本、重大度バリアント→内閣府配色マッピング） | guidelines.md 3.1.A |
| 2 | 警戒レベル1〜5表示コンポーネント（色+数字+文言併記） | guidelines.md 3.1.A |
| 3 | 避難情報（発令・解除、対象地区・日時・件数）の掲載 | guidelines.md 3.1.A |
| 4 | 避難所一覧・地図表示（デジタル庁標準データセットのインポート対応） | guidelines.md 3.1.B |
| 5 | 避難所開設状況のリアルタイム表示（開設前/開設中/満員/閉鎖） | guidelines.md 3.1.B |
| 6 | ハザードマップ（地理院タイル重畳、自前ラスタ非保持） | guidelines.md 3.1.C |
| 7 | 多言語対応（日本語・英語・中国語簡体字・ベトナム語・韓国語） | guidelines.md 3.1.D、`docs/i18n.md` |
| 8 | JIS X 8341-3 AA 相当のアクセシブルなマークアップ、`role="alert"`/`aria-live` | guidelines.md 3.1.E |
| 9 | 災害時モード切替（職員が1アクションで実行可能） | guidelines.md 3.1.G |
| 10 | 静的生成 + CDN 配信、災害時モードの軽量化（1ページ1.6〜3MB以内） | guidelines.md 3.2.H |
| 11 | 住民向け Web Push 通知（緊急バナー・警戒レベル・お知らせの発令をブラウザ通知で配信。Service Worker は受信専用） | issue #35、GeonicDB webpush プロトコル |

## 4. 非機能要件（初期リリースで満たすべき基準）

- **可用性目標**: 発災後72時間以内に主要情報（避難所開設状況等）を提供可能な構成（guidelines.md 1.12(a)(c)）
- **ページサイズ**: 通常時ページも含め1ページ1.6〜3MB を目安に軽量化（東京都ガイドライン）
- **アクセシビリティ**: WCAG 2.2 AA を先取りして目標にする（JIS改正の先取り、guidelines.md 1.8）
- **レスポンシブ**: 320px幅で横スクロールなし
- **多言語**: `lang`属性の正しい設定。対応言語は日本語・英語・中国語簡体字・ベトナム語・韓国語の5言語（`docs/i18n.md`、2026-09-01 やさしい日本語は対象外とする方針に変更）
- **印刷対応CSS**: 避難所一覧・持出品リストpage

## 5. スコープ外（初期リリースでは扱わない）

- L アラートとの直接連携（[任意]項目、将来課題）
- CAP形式でのフィード出力
- Service WorkerはWeb Push受信専用に限り許可（本issue #35 / #41。push 受信・通知表示・Badging API によるバッジ表示／消去を含む）。オフラインキャッシュ・`fetch`イベントのインターセプト等、汎用的なオフライン対応は引き続きスコープ外
- SOBO-WEB / 防災DXデータ連携基盤との連携
- **職員向け管理画面（GeonicDB書き込みUI）の実装**: 当面は Claude Desktop 等のMCP経由でGeonicDBへ直接書き込む運用とする（2026-09-01 方針決定）。`src/config/geonicdb.ts` の接続設定はこの運用でも将来の管理画面実装でも使えるよう残しておく

## 6. Issue 分割方針

MVP機能（3節の#1〜#11）を軸に、Cursor が1issue=1機能で実装できる粒度に分割する。最初のissueは**プロジェクト初期セットアップ**（Next.js scaffold、`@geolonia/geonicdb-sdk`導入、Lint/CI設定）とし、以降を機能単位で積む。
