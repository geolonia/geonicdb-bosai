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
| `npm run sync:geonicdb`           | GeonicDB WS → mock JSON 同期（開発用） |

## GeonicDB WebSocket 同期（開発用）

職員側で GeonicDB に書き込んだ `bosai-Notice` / `bosai-EmergencyBanner` / `bosai-AlertLevel` を、ローカルの `public/mock/` にほぼリアルタイム反映するツールです（[`docs/ws-sync.md`](docs/ws-sync.md)）。住民向けブラウザからは接続しません。

1. `.env` に `GEONICDB_URL`（必要なら `GEONICDB_API_KEY` / `GEONICDB_TENANT`）を設定
2. 一方のターミナルで `npm run dev`
3. 別ターミナルで `npm run sync:geonicdb`

GeonicDB への作成・更新が mock JSON に書き込まれ、開発サーバの画面に反映されます。

## 環境変数

`.env.example` を参照。`GEONICDB_URL` 等は職員向け経路用であり、住民向け公開ページから GeonicDB へ直接接続する用途ではない（`docs/REQUIREMENTS.md` 2.1）。
