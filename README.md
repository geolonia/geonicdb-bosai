# geonicdb-bosai

自治体向け防災サイトのテンプレートリポジトリ。[GeonicDB](https://github.com/geolonia/geonicdb) をバックエンドに、Next.js の静的 export + CDN 配信で住民向けページを提供する。住民ブラウザは `@geolonia/geonicdb-sdk` の `useLdEntities` で GeonicDB へ直接 AJAX する（[`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) 2.1）。

- 要件定義: [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md)
- ガイドライン調査: [`docs/research/guidelines.md`](docs/research/guidelines.md)
- APIキー・ポリシー: [`docs/geonicdb-setup.md`](docs/geonicdb-setup.md)
- アクセシビリティ: [`docs/a11y/README.md`](docs/a11y/README.md)

## セットアップ

Node.js **20.9.0 以上**が必要です。

```bash
npm install
test -f .env.local || cp .env.example .env.local
npm run dev
```

`http://localhost:3000` でトップページが表示される。動的データ（緊急バナー・警戒レベル・お知らせ）は `NEXT_PUBLIC_GEONICDB_*` で指定した GeonicDB から匿名 GET する。

## スクリプト

| コマンド                          | 内容                                      |
| --------------------------------- | ----------------------------------------- |
| `npm run dev`                     | 開発サーバ                                |
| `npm run build`                   | 静的 export（`out/`）                     |
| `npm run lint`                    | ESLint                                    |
| `npm run format` / `format:check` | Prettier                                  |
| `npm run typecheck`               | TypeScript                                |
| `npm test`                        | Vitest                                    |
| `npm run test:a11y`               | トップ主要コンポーネントの axe 検査       |
| `npm run setup:geonicdb`          | XACML ポリシー・職員 API キー作成（冪等） |

## アクセシビリティ

目標は **JIS X 8341-3:2016 適合レベル AA** および **WCAG 2.2 AA**（追加達成基準の先行対応）です。根拠は障害者差別解消法（合理的配慮の提供義務）と要件 N-01〜N-08（`docs/spec/requirements-spec-v1.1.md` 5.1）。

### サイト上の公開ページ（雛形）

| パス                           | 内容                                     |
| ------------------------------ | ---------------------------------------- |
| `/accessibility/`              | ウェブアクセシビリティ方針               |
| `/accessibility/test-results/` | 試験結果（JIS 附属書 JB.3.1 の表示事項） |

文言の編集は `src/config/accessibility-content.ts` で行います。`【要記入】` を自治体の実値に置き換えてください。**試験前に「適合」と名乗らない**でください（WAIC 対応度表記ガイドライン）。

### チェックリスト・支援技術シナリオ

| ドキュメント                                                                     | 用途                                                                                    |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [`docs/a11y/wcag22-aa-checklist.md`](docs/a11y/wcag22-aa-checklist.md)           | WCAG 2.2 追加基準（N-02）と N-01〜N-08 の記入用。完全な達成基準一覧は WAIC 配布物へ委譲 |
| [`docs/a11y/assistive-tech-scenarios.md`](docs/a11y/assistive-tech-scenarios.md) | NVDA / VoiceOver / TalkBack の主要シナリオ                                              |

導入時の流れ:

1. 方針ページの対象範囲・担当部署・達成期限を更新する
2. WAIC「[試験実施ガイドライン](https://waic.jp/docs/jis2016/test-guidelines/)」に従いページを選び、手動試験と支援技術シナリオを実施する
3. チェックリストと `/accessibility/test-results/` を更新して公開する
4. 地図・PDF・動画を追加したら N-04 / N-06 / N-07 の代替提供を同じチェックリストで確認する

`npm run test:a11y` はコンポーネント単位の自動検査です。**JIS 試験の代替にはなりません**。

## GeonicDB（住民向け・匿名読み取り）

公開ページは SDK を `anonymous: true` で初期化し、API キーをクライアントに埋め込みません。読み取り可否はテナント側の XACML ポリシー `bosai-public-read`（`role: anonymous`、`entityType: bosai-*`、GET のみ）で制御します。

`.env.local`（または `.env`）に次を設定します（**秘密情報ではない**）:

```bash
NEXT_PUBLIC_GEONICDB_URL=https://geonicdb.geolonia.com
NEXT_PUBLIC_GEONICDB_TENANT=miya
```

## GeonicDB（職員向け・書き込み）

職員が `geonic` CLI / Claude Desktop MCP で書き込むためのポリシー・API キーは次で作成できます。

```bash
# 前提: geonic auth login 済み、対象テナント選択済み
npm run setup:geonicdb
```

詳細は [`docs/geonicdb-setup.md`](docs/geonicdb-setup.md)。作成した `bosai-staff-write` は `.env` の `GEONICDB_API_KEY` に設定します（公開ページには使いません）。`bosai-public-read`（匿名読み取り）の作成には `tenant_admin` が必要で、権限が無い場合は警告してスキップします（手動で `geonic admin policies create`）。

## 環境変数

`.env.example` を参照。`NEXT_PUBLIC_*` は住民向け匿名読み取り、`GEONICDB_*`（非 PUBLIC）は職員向け経路用です。
