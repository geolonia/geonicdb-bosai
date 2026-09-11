# CLAUDE.md

`geonicdb-bosai` は自治体向け防災サイトのテンプレートリポジトリ。GeonicDB（Context Broker）本体・関連プロジェクトと同じ運用ルールに従う。

## ワークツリー運用

コードの追加・修正・テスト・コミット・PR を伴う作業は、**着手前に必ず**このリポジトリ内へ git worktree を作成し、その中で行う。メインチェックアウト（`geonicdb-bosai/` 直下）は直接編集しない。

```bash
git worktree add .worktrees/geonicdb-bosai-<branch-name> -b <branch-name>
cd .worktrees/geonicdb-bosai-<branch-name>
npm install
```

## 要件・設計の参照先

- 要件定義: `docs/REQUIREMENTS.md`
- ガイドライン調査: `docs/research/guidelines.md`

実装で判断に迷う場合は、まず上記2文書に立ち返ること。特に非機能要件（可用性・アクセシビリティ）は `docs/research/guidelines.md` 3.2 節を参照する。

## Issue 作成時のラベル付け

`gh issue create` で issue を立てる際は、優先度ラベル（`Priority: Emerg/High/Middle/Low`）を必ず付与する。

## 運用: GeonicDB 上のエンティティを直接更新する（警戒レベル変更等）

デモ（`https://geolonia.github.io/geonicdb-bosai/`）は GeonicDB `geolonia` テナント
（`https://geonicdb.geolonia.com`）のエンティティをブラウザから直接 AJAX で読む。職員向け管理画面はまだ無く
（`docs/data-model.md` 参照）、更新は `geonic` CLI（ローカルに `geolonia` テナントで認証済み）で行う。

**`--context` は付けない。** このリポジトリの `public/ngsi-ld/bosai-context.jsonld` はテンプレート用の
プレースホルダー（`@vocab` が `https://example.municipality.example/...`）で、実データは core context の
まま（`level` 等は無印の短縮名）で作成されている。`--context` を指定すると `level` が別 IRI に展開され、
既存属性を更新せず**別属性として重複作成**してしまう（2026-09-11 に実際に発生し、5言語×4属性=20件を
`entities attrs delete` で削除する事故になった）。まず `--context` なしで `geonic entities get <id>` して
既存の属性名を確認してから `update` すること。

### エンティティ一覧（`docs/data-model.md` 準拠）

| type | id パターン | 主な属性 |
|---|---|---|
| `bosai-AlertLevel` | `urn:ngsi-ld:bosai-AlertLevel:current-alert-level:<lang>`（言語ごとシングルトン） | `level`(1-5 int), `label`, `body` |
| `bosai-EmergencyBanner` | `urn:ngsi-ld:bosai-EmergencyBanner:current-banner:<lang>`（言語ごとシングルトン） | `variant`(enum), `heading`, `body`, `linkHref`, `linkText` |
| `bosai-Notice` | `urn:ngsi-ld:bosai-Notice:<translationGroup>:<lang>` | `title`, `body`(Markdown), `publishedAt` |

`<lang>` は5言語: `ja` / `en` / `zh-CN` / `vi` / `ko`。**言語ごとに別エンティティなので、5件同時に更新する。**
更新のたびに `updatedAt` も ISO 8601 (JST) で更新する。

### 警戒レベルの公式文言（`docs/research/guidelines.md` 1.1 節）

| level | 住民が取るべき行動 | 対応情報 | 発表主体 |
|---|---|---|---|
| 1 | 災害への心構えを高める | 早期注意情報 | 気象庁 |
| 2 | 自らの避難行動を確認 | 注意報等 | 気象庁 |
| 3 | 高齢者等は避難、他の人は準備 | 高齢者等避難 | 市町村 |
| 4 | 危険な場所から全員避難 | 避難指示 | 市町村 |
| 5 | 命の危険。直ちに安全確保 | 緊急安全確保 | 市町村 |

「レベル4までに全員避難」「レベル5はレベル4までと異なる段階」という内閣府メッセージングに文言を揃える。

### Web Push への影響

`bosai-AlertLevel` の更新は購読端末への Web Push 通知の**唯一のトリガー**（`shared/bosai-live-entity-types.ts`）。
本番相当のデモ利用者に実際に通知が飛ぶ、取り消せない操作として扱う。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
