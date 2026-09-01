# GeonicDB データモデル（bosai- プレフィックス）

作成日: 2026-09-01
関連: [`REQUIREMENTS.md`](REQUIREMENTS.md) 2.1節、[`i18n.md`](i18n.md)、[`pages/top-page.md`](pages/top-page.md)

トップページの「お知らせ」「緊急バナー」「警戒レベル」を GeonicDB（NGSI-LD）から配信するためのエンティティ設計。

## 設計方針

- **1エンティティ = 1言語**。多言語コンテンツは、言語ごとに別エンティティとして持つ（NGSI-LDの `LanguageProperty`／`languageMap` は使わない）。理由: 職員が言語ごとに個別入力・更新する運用（`guidelines.md` 3.1.D の「定型文テンプレートで即時多言語化」）と相性がよく、GeonicDBの購読（Subscription）も言語単位で発火できる。
- 同一コンテンツの翻訳同士は `translationGroup` プロパティで束ねる。
- 対応言語は `src/config/site-language.ts` の6言語と一致させる: `ja` / `ja-easy` / `en` / `zh-CN` / `vi` / `ko`
- 本文（`body`）は **Markdown ソース**として保存する。アプリ側（クライアント）でHTML相当（React要素）にパースして表示する。**`dangerouslySetInnerHTML` は使わず、`markdown-to-jsx` 等の直接React要素化するパーサーを使うこと**（XSS経路を構造的に塞ぐ。issue #3 のセキュリティレビューで `link.href` のスキーム検証を要求した経緯があるため、Markdown内のリンクも同じ検証関数を通すこと）。
- エンティティ type 名は `bosai-` プレフィックス + PascalCase。
- id は `urn:ngsi-ld:<type>:<translationGroup>:<language>` の形式。

## 共通プロパティ（全type共通）

| プロパティ | 型 | 説明 |
|---|---|---|
| `language` | Property\<string\> | `ja` / `ja-easy` / `en` / `zh-CN` / `vi` / `ko` のいずれか |
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

1. **データ層をGeonicDBエンティティ形状に合わせて再構築**する。現在の `public/mock/*.json`（言語非依存）を、言語別ファイル（例: `public/mock/notices/ja.json` 等）に分割し、上記スキーマ（`language`/`translationGroup`/Markdown `body`）に合わせる。
2. **言語切替時に該当言語のデータを再フェッチする**（現状はUI文言のみ切り替わり、お知らせ・バナー・警戒レベルの中身は言語に連動していない）。
3. Markdownレンダリングを `markdown-to-jsx`（要 `npm install`）で実装し、`a` タグのレンダリングをオーバーライドして既存の href スキーム検証を通す。
4. **実GeonicDB接続は、クライアントから直接叩かない**（`REQUIREMENTS.md` 2.1 の方針を維持）。今回は「GeonicDBエンティティ形状のモックデータ + その形状を前提にしたパース/表示ロジック」までを実装範囲とし、実ブローカーへの問い合わせは `src/lib/geonicdb-read-api.ts` に**参照実装**として置く（`@geolonia/geonicdb-sdk` を使い、`bosai-Notice` 等をクエリする関数。この関数はクライアントの静的ビルドには含めず、将来「短TTLキャッシュ層」のバックエンド実装者が参照するためのコードとして分離する。テストは「正しいNGSI-LDクエリを組み立てているか」を検証する形でよい）。

## スコープ外

- 実GeonicDBブローカーへの接続確認（ローカルに動作中のブローカーが無いため）
- 職員向け管理画面からの書き込み（別issue）
- Subscription/Webhookによるキャッシュ無効化の実装（別issue、`REQUIREMENTS.md` 2.1 に設計方針の記載あり）
