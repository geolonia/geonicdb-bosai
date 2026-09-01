# GeonicDB WebSocket 同期ツール（開発用）

作成日: 2026-09-01
関連: [`data-model.md`](data-model.md)、[`REQUIREMENTS.md`](REQUIREMENTS.md) 2.1節

## 背景

職員側の書き込みは当面 Claude Desktop 等のMCP経由でGeonicDBへ直接行う運用とする（`REQUIREMENTS.md` 5節）。これにより、ローカル開発中に GeonicDB へ投稿した内容を `npm run dev` に反映するには手動でJSONを書き換える必要があり非効率だった。

**GeonicDBのWebSocketイベント（`bosai-Notice` / `bosai-EmergencyBanner` / `bosai-AlertLevel` の3エンティティタイプ）を購読し、`public/mock/` 配下のJSONへ自動反映する開発用ツールを作る。**

## アーキテクチャ上の位置づけ

これは**開発用ツール**であり、`REQUIREMENTS.md` 2.1 の「GeonicDBには住民のブラウザから直接アクセスさせない」方針とは矛盾しない（Node上で動く別プロセスであり、静的サイトのクライアントバンドルには含めない。`src/lib/geonicdb-read-api.ts` と同じ「参照実装／クライアント非同梱」の扱い）。

将来、本番の「短TTLキャッシュ層」バックエンドを実装する際も、同じ WebSocket 購読 → キャッシュ更新のパターンがそのまま使える設計にする（今回のツールが実質的なプロトタイプになる）。

## SDK API（`@geolonia/geonicdb-sdk` 実際の型定義から確認済み）

```ts
const db = new GeonicDB({ baseUrl, apiKey, tenant });
await db.connect(); // WebSocket接続（認証は自動）
db.subscribe({ entityTypes: ["bosai-Notice", "bosai-EmergencyBanner", "bosai-AlertLevel"] });

db.on("subscribed", () => { /* サーバ側で購読フィルタが有効になった */ });
db.on("entityCreated", (event: EntityEvent) => { /* ... */ });
db.on("entityUpdated", (event: EntityEvent) => { /* ... */ });
db.on("entityDeleted", (event: EntityEvent) => { /* ... */ });
db.on("reconnecting", (info) => { /* SDKが自動再接続を試行中 */ });
db.on("error", (err) => { /* ... */ });
```

`EntityEvent.data` / `EntityEvent.entity` はNGSI-LD正規化表現（Property形式）。既存の `validate-top-page-data.ts` のパーサーは keyValues形式・Property形式の両方に対応済みなので、そのまま流用できる。

## やること

1. `scripts/sync-geonicdb.ts`（Node実行、クライアントバンドルには含めない）を作る:
   - `src/config/geonicdb.ts` の `createGeonicdbSyncClient()` で接続（`GEONICDB_SYNC_API_KEY` 優先、未設定時は `GEONICDB_API_KEY`。`GEONICDB_URL` 等。未設定ならエラーメッセージを出して終了する。ポリシー／キー作成は `docs/geonicdb-setup.md`）
   - `connect()` → `subscribe({ entityTypes: ["bosai-Notice", "bosai-EmergencyBanner", "bosai-AlertLevel"] })`
   - `entityCreated` / `entityUpdated` イベント受信時、`entity.type` で分岐:
     - `bosai-Notice`: 既存の `parseNotice`（`validate-top-page-data.ts`）でパースし、`language` を見て該当する `public/mock/notices/<language>.json` の `items` 配列を、同じ `id` があれば置き換え、無ければ先頭に追加して書き込む
     - `bosai-EmergencyBanner`: `parseEmergencyBanner` でパースし、`public/mock/emergency-banner/<language>.json` を丸ごと上書き（シングルトンのため）
     - `bosai-AlertLevel`: `parseAlertLevel` でパースし、`public/mock/alert-level/<language>.json` を丸ごと上書き
   - `entityDeleted` イベント: Noticeの場合は該当idを配列から除去。Banner/AlertLevelは（シングルトンの削除は通常運用で起きない想定のため）警告ログのみでよい
   - パース失敗時はエラーログを出し、該当イベントをスキップ（プロセス全体は落とさない）
   - コンソールに受信イベントを人間可読な形（`[entityUpdated] bosai-Notice ja: 多言語対応を開始しました` 等）でログ出力する
2. `package.json` に `"sync:geonicdb": "tsx scripts/sync-geonicdb.ts"` を追加（`tsx` が無ければ devDependency に追加）
3. `README.md` に使い方を追記: `npm run dev` と並行して別ターミナルで `npm run sync:geonicdb` を起動すると、GeonicDBへの書き込みがほぼリアルタイムで `npm run dev` の画面に反映される、という説明
4. ユニットテスト: イベント→ファイル書き込みのマッピングロジック（parse呼び出し・書き込み先パスの決定・Notice配列のupsert/delete）を、実際のWebSocket接続を張らずにテストできるよう関数を分離してテストする

## スコープ外

- 実際のGeonicDBサーバーへの接続確認（ローカルに動作中のブローカーが無いため、モックしたイベントでのテストのみ）
- 本番の「短TTLキャッシュ層」バックエンドとしての実運用化（今回は開発用ツールの範囲）
