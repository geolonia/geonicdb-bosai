# フロントエンド ベストプラクティス適用方針

作成日: 2026-09-01
関連: [`REQUIREMENTS.md`](REQUIREMENTS.md)、[`research/guidelines.md`](research/guidelines.md)

防災サイトという性質上、「モダンで高機能」より「災害時に確実に・速く・安全に情報が届く」を優先する。以下、優先度順に実装する。2ラウンドに分けて実装する。

---

## ラウンド1: テスト基盤 + パフォーマンス予算

### A. アクセシビリティの自動検査

- `vitest-axe`（または `jest-axe` 相当。Vitest対応のものを選定）を導入
- 対象: トップページ主要コンポーネント（`EmergencyBanner` の5バリアント、`AlertLevelDisplay` の5レベル、`SiteHeader`、`QuickLinks`、`NewsList`）をレンダリングし、`axe` の違反を0件アサートするテストを追加
- CI（`npm test` に統合、またはは別スクリプト `npm run test:a11y` として追加しCIワークフローに組み込む）
- 既知の懸念点（`guidelines.md` 3.2.E）を重点確認: 警戒レベル黄色 `#F2E700` のコントラスト比、`role="alert"`/`aria-live` の設定漏れ

### B. コンポーネントテスト（React Testing Library）

- `@testing-library/react` + `@testing-library/jest-dom`（Vitest環境向けセットアップ）を導入
- 対象:
  - `SafeMarkdown`: Markdown中の `[text](url)` が `isSafeHref` を通ったリンクとしてレンダリングされるか、`javascript:` 等の危険スキームはリンク化されない（テキストのまま or href無し）ことをレンダリング結果で確認（現状は `isSafeHref` の純粋関数テストのみで、実際のレンダリング結果は未検証というギャップが指摘済み）
  - `EmergencyBanner`: 5バリアントそれぞれで正しい `role`/`aria-live`/配色クラスが付与されるか
  - `SiteHeader`: 言語ドロップダウンの選択変更で `onLangChange` が正しい値で呼ばれるか
  - `TopPage` の `loading` → `ready` → `error` の表示切り替え（モックfetchを差し替えてテスト）

### C. パフォーマンス予算 + 高速化手法

**予算（guidelines.md 1.12(b) 東京都ガイドライン準拠）**: 1ページあたりのデータサイズ 1.6〜3MB以内、Lighthouse Performance スコア90以上を目標値とする。

**予算監視**:
- Lighthouse CI（`@lhci/cli`）を導入し、`lighthouserc.js` に上記予算を `assertions` として設定（`resource-summary:total:size` 等）
- GitHub Actions の CI（`.github/workflows/ci.yml`）で `lhci autorun` を実行し、予算超過で失敗させる。閾値の厳格化（仕様 5.8.4 の 500KB 等）は issue #6
- ローカル確認: `npm run lighthouse`
- `next build` の出力（route毎のJSサイズ）を確認し、閾値を超えたら警告するスクリプトも検討（簡易でよい）

**高速化の具体手法（適用するもの）**:
1. **コード分割**: 現時点でクイックリンク4カードの遷移先ページは未実装なので影響は小さいが、今後ページが増える前提で `next/dynamic` によるルート単位の分割方針をドキュメント化しておく
2. **フォント**: カスタムWebフォントは使わずシステムフォントスタックを維持する（現状の実装を確認し、Webフォントを追加しないことを明示的な方針とする）。もし将来追加するなら `next/font` でセルフホスト+`font-display: swap`必須とドキュメントに明記
3. **画像**: `next.config.ts` の `images.unoptimized: true`（静的export上の制約）を踏まえ、画像を使う際はあらかじめWebP/AVIFに変換し、`loading="lazy"` をoffscreen画像に付与する運用ルールをドキュメント化
4. **リソースヒント**: 言語切替時に取得するJSON（`/mock/notices/<lang>.json` 等）について、ヘッダーの言語ドロップダウンに `onMouseEnter`/`onFocus` 等で次に選ばれそうな言語のJSONを `prefetch`（`<link rel="prefetch">` またはJSでの先読み）する軽量な最適化を検討（必須ではなく推奨、実装コストが低ければ入れる）
5. **キャッシュ戦略**: 静的exportの成果物（`out/`）はハッシュ付きファイル名のJS/CSSは長期キャッシュ（`Cache-Control: public, max-age=31536000, immutable`）、HTML本体とモックJSON（将来は実APIレスポンス）は短TTLというCache-Control方針をドキュメント化（実際のヘッダー設定はホスティング/CDN側の責務なので、`docs/deployment.md` 等に指針として記載）
6. **JS最小化**: 現状バンドルは小さいはずだが、`npm run build` 時のバンドルサイズを記録し、大きな依存追加（`markdown-to-jsx` 等）が予算を圧迫していないか都度確認する運用にする

---

## ラウンド2: SEO/OGP + 印刷対応 + セキュリティヘッダー

### D. SEO/OGP メタデータ + 印刷対応CSS

- Next.js の `metadata` エクスポート（`src/app/layout.tsx` / 各page）で `title`, `description`, OGPタグ（`og:title`, `og:description`, `og:type`, `og:locale`）を設定。**言語切替に応じて `<html lang>` と整合する `og:locale` を出すのは静的exportでは難しいため、既定言語(ja)のメタデータを基本とし、他言語はクライアントサイド切替である旨をコメントで明記する**（サーバーサイドレンダリングされないため検索エンジンには既定言語のみが見える制約。将来language別静的ページ生成を検討する余地としてコメントに残す）
- 構造化データ（schema.org JSON-LD）: 緊急バナーに `SpecialAnnouncement` を、クイックリンクの避難所ページ（将来実装時）に `Place` を使う方針を明記（`guidelines.md` 3.2.J）。今回は `SpecialAnnouncement` のJSON-LD出力のみ実装（バナーの`variant`が`notice`以外の時に出力）
- 印刷用CSS（`@media print`）: ヘッダーの装飾・言語ドロップダウン・クイックリンクの「準備中」枠線等を非表示にし、警戒レベル・お知らせ本文が読みやすく印刷されるようにする（`guidelines.md` 3.2.J「印刷対応CSS」[推奨]）

### E. セキュリティヘッダー（ユーザー保護のための追加対策）

静的export（`output: 'export'`）のため、HTTPヘッダーはNext.js側では設定できず、**CDN/ホスティング層で設定する必要がある**。実装としては、参照用の設定ファイル＋ドキュメントを用意する。

- `public/_headers`（Netlify / Cloudflare Pages 形式）を用意し、以下を設定:
  - `Content-Security-Policy`: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`（`connect-src` は将来の実GeonicDB APIオリジンを追加できるようコメントで示す。`style-src 'unsafe-inline'` が必要かどうかは実際のビルド出力を確認して要否判断すること）
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: geolocation=(), camera=(), microphone=()`（現状これらのAPIを使っていないため全て無効化。将来「現在地からの距離順表示」等でgeolocationを使う場合はここを更新する）
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`（`guidelines.md` 3.2.J 必須項目のHSTSに対応）
- CloudFront を使う場合のResponse Headers Policy相当の設定例をコメントまたは別ファイルで併記する（`docs/deployment.md` に集約してよい）
- **既存のビルド出力に対してCSPが実際に壊れないか確認すること**（インラインスクリプト・スタイルの有無をチェックし、必要なら `'unsafe-inline'` を絞り込む。Next.jsの静的exportはNonceベースCSPが使えないため、可能な限り `'unsafe-inline'` を避ける構成にできないか検討し、できなければコメントで理由を明記する）

## スコープ外

- 実際のCDN/ホスティングへのヘッダー設定適用（設定ファイルの用意までで、デプロイ環境が無いため適用確認はできない）
- 多言語ページの静的生成によるSEO最適化（将来課題としてコメントに残す）
- Service Worker は Web Push 受信専用に限り許可（issue #35）。オフラインキャッシュ・`fetch` インターセプトは引き続きスコープ外
