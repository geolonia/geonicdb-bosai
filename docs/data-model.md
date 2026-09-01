# GeonicDB データモデル（bosai- プレフィックス）

作成日: 2026-09-01
関連: [`REQUIREMENTS.md`](REQUIREMENTS.md) 2.1節、[`i18n.md`](i18n.md)、[`pages/top-page.md`](pages/top-page.md)

トップページの「お知らせ」「緊急バナー」「警戒レベル」を GeonicDB（NGSI-LD）から配信するためのエンティティ設計。

## 設計方針

- **1エンティティ = 1言語**。多言語コンテンツは、言語ごとに別エンティティとして持つ（NGSI-LDの `LanguageProperty`／`languageMap` は使わない）。理由: 職員が言語ごとに個別入力・更新する運用（`guidelines.md` 3.1.D の「定型文テンプレートで即時多言語化」）と相性がよく、GeonicDBの購読（Subscription）も言語単位で発火できる。
- 同一コンテンツの翻訳同士は `translationGroup` プロパティで束ねる。
- 対応言語は `src/config/site-language.ts` の5言語と一致させる: `ja` / `en` / `zh-CN` / `vi` / `ko`
- 本文（`body`）は **Markdown ソース**として保存する。アプリ側（クライアント）でHTML相当（React要素）にパースして表示する。**`dangerouslySetInnerHTML` は使わず、`markdown-to-jsx` 等の直接React要素化するパーサーを使うこと**（XSS経路を構造的に塞ぐ。issue #3 のセキュリティレビューで `link.href` のスキーム検証を要求した経緯があるため、Markdown内のリンクも同じ検証関数を通すこと）。
- エンティティ type 名は `bosai-` プレフィックス + PascalCase。
- id は `urn:ngsi-ld:<type>:<translationGroup>:<language>` の形式。

## 共通プロパティ（全type共通）

| プロパティ | 型 | 説明 |
|---|---|---|
| `language` | Property\<string\> | `ja` / `en` / `zh-CN` / `vi` / `ko` のいずれか |
| `translationGroup` | Property\<string\> | 同一コンテンツの翻訳をまとめるID |
| `updatedAt` | Property\<DateTime\>（ISO 8601） | 最終更新日時。トップページの「更新: ...」表示に使う |

## `bosai-Notice`（新着・お知らせ）

- id例: `urn:ngsi-ld:bosai-Notice:2026-bousai-training:ja`
- `title` (Property\<string\>)
- `body` (Property\<string\>, Markdown)
- `publishedAt` (Property\<DateTime\>)
- 共通プロパティ（`language` / `translationGroup` / `updatedAt`）

## `bosai-EmergencyBanner`（緊急バナー）

**言語ごとのシングルトン**（`translationGroup` は固定値 `"current-banner"`）。職員が発令・解除する際は、6言語ぶんのエンティティを同時に更新する（または未更新分は前回の翻訳が残る＝翻訳漏れが可視化される設計）。

- id例: `urn:ngsi-ld:bosai-EmergencyBanner:current-banner:ja`
- `variant` (Property\<string\> enum): `emergency-safety` \| `evacuation-order` \| `elderly-evacuation` \| `advisory` \| `notice`（内閣府配色5バリアントに対応。既存 `alert-colors.ts` のキーをこの英語enumに合わせて変更する）
- `heading` (Property\<string\>)
- `body` (Property\<string\>, Markdown、短い説明)
- `linkHref` (Property\<string\>, 任意, http/https/相対パスのみ許可 — 既存の `validateEmergencyBannerLinkHref` を流用)
- `linkText` (Property\<string\>, 任意)
- 共通プロパティ

## `bosai-AlertLevel`（警戒レベル）

**言語ごとのシングルトン**（`translationGroup` は固定値 `"current-alert-level"`）。

- id例: `urn:ngsi-ld:bosai-AlertLevel:current-alert-level:ja`
- `level` (Property\<integer\>, 1〜5)
- `label` (Property\<string\>) — 例:「警戒レベル1：早期注意情報（平時）」
- `body` (Property\<string\>, Markdown or 短文) — 例:「災害への心構えを高める」
- 共通プロパティ

## `@context`

`public/ngsi-ld/bosai-context.jsonld` に、上記の短縮プロパティ名を定義したJSON-LDコンテキストを置く（テンプレートなので、自治体側でホスト名を差し替えられるようプレースホルダーにする）。

## アプリ側の変更方針

1. **データ層をGeonicDBエンティティ形状に合わせる**。`bosai-Notice` / `bosai-EmergencyBanner` / `bosai-AlertLevel` は言語プロパティ付きでブローカー上に保持する。
2. **言語切替時に該当言語のデータを再フェッチする**（`useLdEntities` の `q: 'language=="<lang>"'`）。
3. Markdownレンダリングを `markdown-to-jsx` で実装し、`a` タグの href スキーム検証を通す。
4. **住民向け公開ページはブラウザから GeonicDB へ直接 AJAX する**（`REQUIREMENTS.md` 2.1）。SDK を `anonymous: true` で初期化し、Property 形式エンティティを `validate-top-page-data.ts` で正規化する。

## スコープ外

- 職員向け管理画面からの書き込み（別issue。当面は CLI / MCP）
- 短TTLキャッシュ層の再導入（輻輳耐性を優先する場合の選択肢として旧設計が `git log` に残る）
