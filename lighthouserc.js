/**
 * Lighthouse CI 設定（仕様 5.8.4 / issue #6）。
 *
 * 災害時トップ相当のページ重量予算:
 * - HTML ≤ 50KB … error（CI ブロック）
 * - CSS ≤ 30KB … error（CI ブロック）
 * - JS ≤ 100KB（圧縮後）… warn（現状 Next.js ランタイム超過。削減は別作業）
 * - 合計 ≤ 500KB … warn
 * - Performance スコア ≥ 0.95 … error
 *
 * CI 組み込みは ci.yml（#9）。本ファイルは閾値のみ。
 *
 * 実行: `npm run lighthouse`（内部で build → lhci autorun）
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
        "categories:performance": ["error", { minScore: 0.95 }],
        "resource-summary:document:size": [
          "error",
          { maxNumericValue: 50 * 1024 },
        ],
        "resource-summary:stylesheet:size": [
          "error",
          { maxNumericValue: 30 * 1024 },
        ],
        "resource-summary:script:size": [
          "warn",
          { maxNumericValue: 100 * 1024 },
        ],
        "resource-summary:total:size": [
          "warn",
          { maxNumericValue: 500 * 1024 },
        ],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci",
    },
  },
};
