# geonicdb-bosai

自治体向け防災サイトのテンプレートリポジトリ。[GeonicDB](https://github.com/geolonia/geonicdb) を書き込み・リアルタイム更新のバックエンドに、Next.js による静的生成 + CDN 配信を住民向け読み取り経路に採用する。

- 要件定義: [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md)
- ガイドライン調査: [`docs/research/guidelines.md`](docs/research/guidelines.md)

## セットアップ

Node.js **20.9.0 以上**が必要です。

```bash
npm install
test -f .env || cp .env.example .env   # 職員向け GeonicDB 接続が必要な場合のみ（既存 .env は上書きしない）
npm run dev
```

`http://localhost:3000` で最小ページが表示される。

## スクリプト

| コマンド                          | 内容                  |
| --------------------------------- | --------------------- |
| `npm run dev`                     | 開発サーバ            |
| `npm run build`                   | 静的 export（`out/`） |
| `npm run lint`                    | ESLint                |
| `npm run format` / `format:check` | Prettier              |
| `npm run typecheck`               | TypeScript            |
| `npm test`                        | Vitest                |
| `npm run setup:geonicdb`          | XACML ポリシー・API キー作成（冪等） |
| `npm run sync:geonicdb`           | GeonicDB WS → mock JSON 同期（開発用） |

## GeonicDB セットアップ（APIキー・ポリシー）

職員書き込み用・同期ツール読み取り用の XACML ポリシーと API キーを、`geonic` CLI で冪等に作成します（[`docs/geonicdb-setup.md`](docs/geonicdb-setup.md)）。

前提: [`geonicdb-cli`](https://github.com/geolonia/geonicdb-cli) をインストール済みで、`geonic auth login`（または `--client-credentials`）済み、対象テナントが選択されていること。

```bash
npm run setup:geonicdb
```

作成物:

| 名前 | 種別 | `.env` への反映先 |
| --- | --- | --- |
| `bosai-write` / `bosai-read` | XACML ポリシー | （なし） |
| `bosai-staff-write` | API キー | `GEONICDB_API_KEY` |
| `bosai-sync-read` | API キー | `GEONICDB_SYNC_API_KEY` |

キー値は作成時に標準出力へ一度だけ表示されます。`.env` へ手動でコピーしてください（スクリプトは `.env` に書き込みません）。API キー上限(5)で `bosai-sync-read` が作れない場合は `GEONICDB_API_KEY`（`bosai-staff-write`）だけで運用可能です（sync は未設定時にフォールバック）。詳細は [`docs/geonicdb-setup.md`](docs/geonicdb-setup.md)。

## GeonicDB WebSocket 同期（開発用）

職員側で GeonicDB に書き込んだ `bosai-Notice` / `bosai-EmergencyBanner` / `bosai-AlertLevel` を、ローカルの `public/mock/` にほぼリアルタイム反映するツールです（[`docs/ws-sync.md`](docs/ws-sync.md)）。住民向けブラウザからは接続しません。

1. 上記 `npm run setup:geonicdb` でポリシー・API キーを用意（任意だが推奨）
2. `.env` に `GEONICDB_URL`（必要なら `GEONICDB_SYNC_API_KEY` または `GEONICDB_API_KEY` / `GEONICDB_TENANT`）を設定
3. 一方のターミナルで `npm run dev`
4. 別ターミナルで `npm run sync:geonicdb`

GeonicDB への作成・更新が mock JSON に書き込まれ、開発サーバの画面に反映されます。同期クライアントは `GEONICDB_SYNC_API_KEY` を優先し、未設定時は `GEONICDB_API_KEY` にフォールバックします。

## 環境変数

`.env.example` を参照。`GEONICDB_URL` 等は職員向け経路用であり、住民向け公開ページから GeonicDB へ直接接続する用途ではない（`docs/REQUIREMENTS.md` 2.1）。
