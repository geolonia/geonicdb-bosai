/**
 * Lighthouse CI 設定（docs/frontend-best-practices.md ラウンド1 C）。
 *
 * 予算:
 * - Performance スコア >= 0.9
 * - 1ページ総転送量 <= 3 MiB（東京都ガイドライン上限）
 *
 * 実行: `npm run lighthouse`（先に `npm run build`）
 */
module.exports = {
  ci: {
    collect: {
      staticDistDir: "./out",
      url: ["http://localhost/"],
      numberOfRuns: 1,
      settings: {
        // 防災サイトはモバイル想定が強いが、予算監視は desktop 固定で再現性を優先
        preset: "desktop",
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.9 }],
        "resource-summary:total:size": [
          "error",
          { maxNumericValue: 3_145_728 },
        ],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci",
    },
  },
};
