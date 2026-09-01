# GeonicDB セットアップ（APIキー・XACMLポリシー）

作成日: 2026-09-01
関連: [`data-model.md`](data-model.md)、[`ws-sync.md`](ws-sync.md)

`geonicdb-cli`（コマンド名 `geonic`）を使い、`bosai-` プレフィックスの命名規則で APIキー・XACMLポリシーをセットアップする。CLIコマンド・XACMLポリシーの仕様は `geonicdb`/`geonicdb-cli` 本体のコード・`docs/AUTH.md`（本体側）から実際に確認したもの。下記ポリシー JSON・`--origins` 要件は staging テナントで作成成功を確認済み。

## 前提

- `geonic auth login`（または `--client-credentials`）で既にログイン済みで、対象テナントが選択されていること
- 本スクリプトは既存のテナントに対してAPIキー・ポリシーを作成する（テナント自体の新規作成は行わない。テナント名は `^[a-z0-9_]+$` の制約がありハイフンを含む `bosai-` プレフィックスは使えないため、対象外とする）

## 命名規則

| 種別 | 名前 | 用途 |
|---|---|---|
| XACMLポリシー | `bosai-write` | `bosai-*` エンティティタイプへの書き込み（POST/PATCH/PUT/DELETE）を許可。職員のGeonicDB直接操作（Claude Desktop等のMCP経由）向け |
| XACMLポリシー | `bosai-read` | `bosai-*` エンティティタイプへの読み取り（GET、WebSocket購読）を許可。`scripts/sync-geonicdb.ts` 向け |
| APIキー | `bosai-staff-write` | `bosai-write` ポリシーを付与。職員が使う（APIキー上限時は sync 読み取りにも兼用可） |
| APIキー | `bosai-sync-read` | `bosai-read` ポリシーを付与。ローカル同期ツール専用（最小権限）。ユーザーあたり上限(5)に達している場合は作成をスキップし、`bosai-staff-write` を代用する |

XACMLポリシーの `policyId`・APIキーの `name` は文字種の制約が無く（長さ制限のみ、`policyId`は最大256文字・`name`は最大100文字）、`bosai-` プレフィックスをそのまま使える（`geonicdb/docs/AUTH.md` 1277-1284行で確認済み。ただし `/` を含むIDと、`policyId` が文字列 `import` そのものは避けること）。

エンティティタイプのスコープには XACML の `resources` に `attributeId: "entityType"` を指定する。`matchFunction: "glob"` を使うと `bosai-*` で3タイプ（`bosai-Notice`/`bosai-EmergencyBanner`/`bosai-AlertLevel`）を一括でスコープできる（本体AUTH.md 2148-2166行のサンプルポリシーを参考に構成）。今回のプレフィックス命名は、この glob スコープを可能にするという実利もある。

## ポリシー定義

**確認済み（staging）**: `rules[]` の各要素に `ruleId`（string）が必須。`target.subjects` は個人スコープ作成時に省略可能。

### `bosai-write`

```json
{
  "policyId": "bosai-write",
  "description": "geonicdb-bosai: write access to bosai-* entity types (staff content updates)",
  "target": {
    "resources": [
      { "attributeId": "path", "matchValue": "/v2/**", "matchFunction": "glob" },
      { "attributeId": "entityType", "matchValue": "bosai-*", "matchFunction": "glob" }
    ]
  },
  "ruleCombiningAlgorithm": "first-applicable",
  "rules": [
    {
      "ruleId": "permit-bosai-write",
      "effect": "Permit",
      "target": {
        "actions": [
          { "attributeId": "method", "matchValue": "GET" },
          { "attributeId": "method", "matchValue": "POST" },
          { "attributeId": "method", "matchValue": "PATCH" },
          { "attributeId": "method", "matchValue": "PUT" },
          { "attributeId": "method", "matchValue": "DELETE" }
        ]
      }
    },
    { "ruleId": "deny-rest", "effect": "Deny" }
  ]
}
```

### `bosai-read`

```json
{
  "policyId": "bosai-read",
  "description": "geonicdb-bosai: read access to bosai-* entity types (WebSocket sync tool)",
  "target": {
    "resources": [
      { "attributeId": "path", "matchValue": "/v2/**", "matchFunction": "glob" },
      { "attributeId": "entityType", "matchValue": "bosai-*", "matchFunction": "glob" }
    ]
  },
  "ruleCombiningAlgorithm": "first-applicable",
  "rules": [
    {
      "ruleId": "permit-bosai-read",
      "effect": "Permit",
      "target": {
        "actions": [
          { "attributeId": "method", "matchValue": "GET" }
        ]
      }
    },
    { "ruleId": "deny-rest", "effect": "Deny" }
  ]
}
```

`geonic me policies create` は個人スコープ（`scope: personal`、`priority` はサーバー側で100固定）で作成される。上記のとおり `target.subjects` を省略しても staging では作成・動作を確認済み。

## やること

1. `scripts/setup-geonicdb.sh` を作成する。内容:
   - `geonic me policies get bosai-write` 等で既存チェックし、無ければ `geonic me policies create '<上記JSON>'` で作成（再実行してもエラーにならないよう存在チェックを挟む）
   - 同様に `bosai-read` ポリシーも作成
   - `geonic me api-keys create --name bosai-staff-write --policy bosai-write --origins '*'` でAPIキー作成（`--origins` は staging で実質必須。未指定だと `expected array, received undefined`。既存キーの重複作成防止は `geonic me api-keys list` で名前を確認してからにする。`--save` は付けない）
   - 同様に `geonic me api-keys create --name bosai-sync-read --policy bosai-read --origins '*'` を実行。`Maximum number of API keys` エラー時は警告してスキップし、スクリプトは exit 0 のまま継続（`bosai-staff-write` を `GEONICDB_API_KEY` として書き込み・sync の両方に使う。sync 側は `GEONICDB_SYNC_API_KEY` 未設定時にフォールバック）
   - 実行後、作成されたAPIキーの値を `.env` の `GEONICDB_API_KEY`（staff-write用）・`GEONICDB_SYNC_API_KEY`（sync-read用・作成できた場合）に設定するよう促すメッセージを表示する（キー自体をファイルに書き込んだりログに残したりしない。標準出力に一度表示するのみ）
   - `set -euo pipefail` で通常失敗時に止まるようにする（APIキー上限スキップは例外）。`geonic` コマンドが無い場合はインストール手順（geonicdb-cli の README参照）を案内して終了する
2. `src/config/geonicdb.ts` に、同期ツール専用の設定解決関数 `resolveGeonicdbSyncConfig` / `createGeonicdbSyncClient` を追加する。`GEONICDB_SYNC_API_KEY` を読み、未設定なら `GEONICDB_API_KEY` にフォールバックする（開発初期で1つのキーしか作っていない場合でも動くように）。`scripts/sync-geonicdb.ts` はこちらを使うよう変更する
3. `.env.example` に `GEONICDB_SYNC_API_KEY` を追加（コメントで用途を説明）
4. `README.md` にセットアップ手順を追記:
   - `geonic auth login` が前提であること
   - `npm run setup:geonicdb`（`package.json` に `"setup:geonicdb": "bash scripts/setup-geonicdb.sh"` を追加）でポリシー・APIキーを作成できること
   - 作成後、`.env` に反映する手順
   - `npm run sync:geonicdb` との連携（`docs/ws-sync.md` 参照）

## スコープ外

- テナント自体の新規作成（前提として既存テナントを使う）
- 作成済みリソースの削除・ローテーション手順の自動化（上限回避のための既存キー整理は利用者が手動で行う）
