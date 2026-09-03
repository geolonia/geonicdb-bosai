# デプロイ・キャッシュ方針

作成日: 2026-09-01
関連: [`frontend-best-practices.md`](frontend-best-practices.md)、[`REQUIREMENTS.md`](REQUIREMENTS.md) 2.2

静的 export（`next build` → `out/`）を CDN / オブジェクトストレージ等で配信する前提の指針。
HTTP ヘッダーの実設定はホスティング側の責務（ラウンド2で `public/_headers` 等を追加予定）。

## Cache-Control

| 対象 | 推奨 |
|---|---|
| ハッシュ付き JS/CSS（`/_next/static/**`） | `public, max-age=31536000, immutable` |
| HTML（`*.html` / `/`） | 短 TTL（例: `public, max-age=60, must-revalidate`）または CDN で即時無効化可能に |
| GeonicDB NGSI-LD 応答（ブラウザからの差分取得） | GeonicDB / CDN のキャッシュ方針に従う。初期表示はビルド時スナップショット（`REQUIREMENTS.md` 2.1） |

## 画像

`next.config.ts` で `images.unoptimized: true`（静的 export 制約）。画像を追加する場合:

- 事前に WebP / AVIF へ変換する
- ビューポート外は `loading="lazy"`（LCP 候補は eager）
- 大きなヒーロー画像は避ける（1ページ 1.6〜3MB 予算）

## コード分割

ルート単位は App Router のファイル分割に任せる。重いクライアント専用 UI は `next/dynamic` で遅延読み込みする（現状クイックリンク先は未実装のため未使用）。

## Lighthouse 予算のローカル確認

```bash
npm run build
npm run lighthouse
```

Performance >= 90、総サイズ <= 3MiB。CI（`.github/workflows/ci.yml`）でも同予算を強制する。閾値の引き上げは issue #6。

## 可用性・負荷試験

災害時の最終公開状態維持・定期リビルド・負荷試験／監視の手順は [`availability-ops.md`](availability-ops.md) を参照。
