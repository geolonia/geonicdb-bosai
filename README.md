# geonicdb-bosai

自治体向け防災サイトのテンプレートリポジトリ。[GeonicDB](https://github.com/geolonia/geonicdb) をバックエンドに、Next.js の静的 export + CDN 配信で住民向けページを提供する。住民ブラウザは `@geolonia/geonicdb-sdk` の `useLdEntities` で GeonicDB へ直接 AJAX する（[`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) 2.1）。

- 要件定義: [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md)
- ガイドライン調査: [`docs/research/guidelines.md`](docs/research/guidelines.md)
- APIキー・ポリシー: [`docs/geonicdb-setup.md`](docs/geonicdb-setup.md)

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
| `npm run setup:geonicdb`          | XACML ポリシー・職員 API キー作成（冪等） |

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
