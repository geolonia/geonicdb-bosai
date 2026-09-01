# GeonicDB セットアップ（APIキー・XACMLポリシー）

作成日: 2026-09-01 / 改訂: 2026-09-01（直接AJAX方式への移行、WS動作確認済み）
関連: [`data-model.md`](data-model.md)、[`REQUIREMENTS.md`](REQUIREMENTS.md) 2.1節

`geonicdb-cli`（コマンド名 `geonic`）を使い、`bosai-` プレフィックスの命名規則で APIキー・XACMLポリシーをセットアップする。**全て実際のテナント（staging）に対して実行・動作確認済み。**

## 前提

- `geonic auth login`（または `--client-credentials`）で既にログイン済みで、対象テナントが選択されていること
- **匿名読み取り用ポリシー（`bosai-public-read`）の作成には `tenant_admin` 権限が必要**（`geonic admin policies create`）。書き込み用ポリシー（`bosai-write`）は自分自身のアカウントに対して `geonic me policies create` で作成できる（`tenant_admin` 不要）
- 本スクリプトは既存のテナントに対してAPIキー・ポリシーを作成する（テナント自体の新規作成は行わない。テナント名は `^[a-z0-9_]+$` の制約がありハイフンを含む `bosai-` プレフィックスは使えないため対象外）

## 命名規則

| 種別 | 名前 | scope | 用途 |
|---|---|---|---|
| XACMLポリシー | `bosai-public-read` | tenant（管理者作成） | `bosai-*` への匿名（住民ブラウザ）GET読み取りを許可。`role: anonymous` |
| XACMLポリシー | `bosai-write` | personal | `bosai-*` への書き込み（POST/PATCH/PUT/DELETE/GET/WS）を許可。職員のGeonicDB直接操作（`geonic` CLI / Claude Desktop MCP）向け |
| APIキー | `bosai-staff-write` | - | `bosai-write` ポリシーを付与。職員が使う |

XACMLポリシーの `policyId`・APIキーの `name` は文字種の制約が無く（長さ制限のみ）、`bosai-` プレフィックスをそのまま使える。エンティティタイプのスコープは `resources` に `{"attributeId": "entityType", "matchValue": "bosai-*", "matchFunction": "glob"}` で3タイプ一括指定する。

## ポリシー定義（実際に動作確認済み）

### `bosai-public-read`（匿名読み取り、要 tenant_admin）

住民のブラウザが `useLdEntities`（匿名モード）で直接GeonicDBを読むための、`role: anonymous` を対象としたポリシー。**匿名curlで実際に読み取れることを確認済み。**

```bash
geonic admin policies create '{
  "policyId": "bosai-public-read",
  "description": "geonicdb-bosai: anonymous public read access to bosai-* entity types (citizen-facing AJAX)",
  "target": {
    "subjects": [
      { "attributeId": "role", "matchValue": "anonymous" }
    ],
    "resources": [
      { "attributeId": "path", "matchValue": "/ngsi-ld/**", "matchFunction": "glob" },
      { "attributeId": "entityType", "matchValue": "bosai-*", "matchFunction": "glob" }
    ]
  },
  "ruleCombiningAlgorithm": "first-applicable",
  "rules": [
    {
      "ruleId": "permit-bosai-public-read",
      "effect": "Permit",
      "target": {
        "actions": [
          { "attributeId": "method", "matchValue": "GET" }
        ]
      }
    },
    { "ruleId": "deny-rest", "effect": "Deny" }
  ]
}'
```

### `bosai-write`（職員書き込み + WS購読）

```bash
geonic me policies create '{
  "policyId": "bosai-write",
  "description": "geonicdb-bosai: write access to bosai-* entity types (staff content updates, NGSI-LD)",
  "target": {
    "resources": [
      { "attributeId": "path", "matchValue": "/ngsi-ld/**", "matchFunction": "glob" },
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
          { "attributeId": "method", "matchValue": "DELETE" },
          { "attributeId": "method", "matchValue": "WS" }
        ]
      }
    },
    { "ruleId": "deny-rest", "effect": "Deny" }
  ]
}'
```

**重要な実装上の注意（実運用で踏んだ罠、修正済み）**:

1. **`rules[]` の各要素に `ruleId` が必須。** 無いと `Invalid input: expected string, received undefined` で作成が失敗する。
2. **リソースパスは `/ngsi-ld/**` を使うこと。`/v2/**`（NGSIv2）ではない。** SDK の `createEntity`/`updateEntity`/`getEntities` 等はすべて NGSI-LD パス（`/ngsi-ld/v1/entities`）を叩く。`/v2/**` のみを対象にすると、APIキー経由の書き込みが `Access denied: no applicable policy` で失敗する（`geonic` CLIの管理者セッションでは気づかない — 管理者はポリシー評価をバイパスするため）。
3. **WebSocket購読を許可するには `method: "WS"` をルールに含める。** GeonicDBの `authorizeWs()` は `WS ⊂ GET` の原則で、同じリクエストを `method=WS` と `method=GET` の両方で評価し、**両方**Permitである必要がある（`geonicdb/docs/AUTH.md` 1462行〜）。読み取りフレームは固定で `/ngsi-ld/v1/entities` なので、リソースパスがこれをカバーしていることも必須。
4. **ポリシー更新はテナント側で反映に数分かかることがある。** 更新直後にWS購読すると `Access denied by policy` になることがあるが、ポリシー自体は正しく保存されている。数分待って再試行すると通る（実測）。

### APIキー

```bash
geonic me api-keys create --name "bosai-staff-write" --policy bosai-write --origins '*'
```

`--origins` は実質必須（未指定だと `Invalid input: expected array, received undefined`）。キー値は作成時に一度だけ表示される。`.env` の `GEONICDB_API_KEY` 等に反映する場合は、必ず利用者自身が行うこと（自動化ツールがAPIキーをファイルに書き込むべきではない）。

## 実際に確認済みの動作

- 匿名curlで `bosai-public-read` により `bosai-AlertLevel` 等が読み取れること
- `bosai-staff-write` キーで `db.connect()` → `db.subscribe({entityTypes: [...]})` → `db.updateEntity(...)` → WebSocketで `entityUpdated` イベントを実際に受信すること（Node環境での確認。ブラウザではOriginヘッダーが自動付与されるため同様に動作する）

## スコープ外

- テナント自体の新規作成（前提として既存テナントを使う）
- 職員向け管理画面（Web UI）からの書き込み — 当面 `geonic` CLI / Claude Desktop（MCP）で代替する（`REQUIREMENTS.md` 5節）
