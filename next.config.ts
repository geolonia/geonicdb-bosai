import type { NextConfig } from "next";

/**
 * 住民向け公開サイトは完全静的 export（REQUIREMENTS.md 2.2）。
 * 画像最適化 API は Node ランタイムが必要なため、静的ホスティングでは無効化する
 *（画像は事前変換 + loading="lazy" 運用。docs/deployment.md / frontend-best-practices.md）。
 * ページサイズ目安 1.6〜3MB（REQUIREMENTS.md 4）。予算監視は `npm run lighthouse`。
 *
 * ルートが増えたら重いクライアント UI は next/dynamic で分割する
 *（現状はトップのクイックリンク先未実装のため未使用）。
 */
const nextConfig: NextConfig = {
  output: "export",
  images: {
    // 静的 export では Image Optimization API が使えない。
    // 追加画像は WebP/AVIF 事前変換 + offscreen は loading="lazy" を付与すること。
    unoptimized: true,
  },
  // ハッシュ付き静的アセットは CDN で長期キャッシュ（docs/deployment.md）
  poweredByHeader: false,
};

export default nextConfig;
