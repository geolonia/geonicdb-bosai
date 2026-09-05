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
| XACMLポリシー | `bosai-read` | personal | `bosai-*` への **GET + WS のみ**を許可（書き込み不可）。住民ブラウザのWebSocket購読向け |
| XACMLポリシー | `bosai-webpush-proxy-write` | personal（既作成） | `/ngsi-ld/v1/subscriptions*` への **POST / DELETE / GET のみ**。エンティティ読み書き不可。Web Push 購読登録向け |
| XACMLポリシー | `bosai-write` | personal | `bosai-*` への書き込み（POST/PATCH/PUT/DELETE/GET/WS）を許可。職員のGeonicDB直接操作（`geonic` CLI / Claude Desktop MCP）向け |
| APIキー | `bosai-public-ws-read` | - | `bosai-read` ポリシーを付与。**クライアントバンドルに埋め込む**（`NEXT_PUBLIC_GEONICDB_WS_API_KEY`）。DPoP必須・オリジン限定 |
| APIキー | `bosai-webpush-subscribe` | - | `bosai-webpush-proxy-write` を付与。**クライアントバンドルに埋め込む**（`NEXT_PUBLIC_GEONICDB_WEBPUSH_API_KEY`）。DPoP必須・オリジン限定（`https://geolonia.github.io` + `http://localhost:3000`）・`rateLimit.perMinute=30`。エンティティ書き込み権限なし |
| APIキー | `bosai-staff-write` | - | `bosai-write` ポリシーを付与。職員が使う。**クライアントには絶対に埋め込まない** |

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

### `bosai-read`（住民ブラウザのWebSocket購読用、読み取り専用）

SDKの `connect()` は匿名モードでは使えない（トークンが必要）ため、WebSocket購読には認証済みセッションが必須。**書き込みを一切許可しない**読み取り専用ポリシーを用意し、これを付与したAPIキーだけをクライアントに埋め込む。

```bash
geonic me policies create '{
  "policyId": "bosai-read",
  "description": "geonicdb-bosai: read-only + WS subscribe access to bosai-* (public client-side live updates)",
  "target": {
    "resources": [
      { "attributeId": "path", "matchValue": "/ngsi-ld/**", "matchFunction": "glob" },
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
          { "attributeId": "method", "matchValue": "GET" },
          { "attributeId": "method", "matchValue": "WS" }
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

#### 住民ブラウザ用（WebSocket購読、読み取り専用）

**このキーはクライアントバンドルに埋め込まれ第三者から見える。** そのため、書き込み権限のない `bosai-read` ポリシーを付与し、さらに DPoP 必須・オリジン限定で発行する。

```bash
# 作成（--dpop-required と --origins をここで指定する）
geonic admin api-keys create --name "bosai-public-ws-read" --policy bosai-read \
  --origins 'http://localhost:3000' --dpop-required
```

発行したキー値を `.env.local` の `NEXT_PUBLIC_GEONICDB_WS_API_KEY` に設定する。**本番環境では自治体の実ドメインを `--origins` に指定した別キーを発行し直すこと。**

> **APIキーの上限（実測）**: `geonic me api-keys create`（セルフサービス）はユーザーあたり5個の上限があり、超えると `Maximum number of API keys (5) reached` で失敗する。`geonic admin api-keys create`（tenant_admin権限）はこの上限の対象外だった。

#### Web Push 購読登録用（サブスクリプション専用）

| 項目 | 値 |
|---|---|
| ポリシー名 | `bosai-webpush-proxy-write`（`/ngsi-ld/v1/subscriptions*` の POST/DELETE/GET のみ。既作成） |
| APIキー名 | `bosai-webpush-subscribe`（このキーの**値**を `NEXT_PUBLIC_GEONICDB_WEBPUSH_API_KEY` に設定） |
| allowedOrigins | `https://geolonia.github.io`, `http://localhost:3000` |
| dpopRequired | `true` |
| rateLimit.perMinute | `30` |

GitHub Secret `NEXT_PUBLIC_GEONICDB_WEBPUSH_API_KEY` には発行済みキー値を投入済み。再発行例:

```bash
geonic admin api-keys create --name "bosai-webpush-subscribe" --policy bosai-webpush-proxy-write \
  --origins 'https://geolonia.github.io,http://localhost:3000' --dpop-required --rate-limit 30
```

発行したキー値を `.env.local` / GitHub Secrets の `NEXT_PUBLIC_GEONICDB_WEBPUSH_API_KEY` に設定する。
**`bosai-write`（エンティティ書き込み可）は絶対に埋め込まないこと。**

#### 職員書き込み用

```bash
geonic me api-keys create --name "bosai-staff-write" --policy bosai-write --origins '*'
```

`--origins` は実質必須（未指定だと `Invalid input: expected array, received undefined`）。キー値は作成時に一度だけ表示される。**このキーはクライアントに埋め込まないこと**（`NEXT_PUBLIC_*` に設定してはならない）。

## 実際に確認済みの動作

- 匿名curlで `bosai-public-read` により `bosai-AlertLevel` 等が読み取れること
- 匿名（未認証）でのPOSTが **403 Forbidden**（`no applicable policy`）で拒否されること
- `bosai-public-ws-read` キー（DPoP必須・オリジン限定）で:
  - `getEntities()` は成功する
  - `createEntity()` / `updateEntity()` / `deleteEntity()` はすべて **403 `Access denied by policy`** で拒否される
  - `db.connect()` → `db.subscribe({entityTypes: ['bosai-Notice','bosai-EmergencyBanner','bosai-AlertLevel']})` が成功し、別セッションからの更新で `entityUpdated` イベントを受信する
- ブラウザ（`npm run dev` + `.env.local` 設定済み）で、**ページをリロードせずに** 外部からの警戒レベル更新が画面へ反映されること

## スコープ外

- テナント自体の新規作成（前提として既存テナントを使う）
- 職員向け管理画面（Web UI）からの書き込み — 当面 `geonic` CLI / Claude Desktop（MCP）で代替する（`REQUIREMENTS.md` 5節）
