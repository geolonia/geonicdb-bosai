import type { NextConfig } from "next";

/**
 * 住民向け公開サイトは完全静的 export（REQUIREMENTS.md 2.2）。
 * 画像最適化 API は Node ランタイムが必要なため、静的ホスティングでは無効化する。
 * ページサイズ目安 1.6〜3MB（REQUIREMENTS.md 4）を意識し、不要なサーバ機能を載せない。
 */
const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  // 静的アセットの長期キャッシュ向け（ファイル名ハッシュ付き）
  poweredByHeader: false,
};

export default nextConfig;
