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

## 環境変数

`.env.example` を参照。`GEONICDB_URL` 等は職員向け経路用であり、住民向け公開ページから GeonicDB へ直接接続する用途ではない（`docs/REQUIREMENTS.md` 2.1）。
