/**
 * Lighthouse CI 設定（仕様 5.8.4 / 5.8.5 / issue #6）。
 *
 * 災害時トップ相当のページ重量予算:
 * - HTML ≤ 50KB … error（CI ブロック）
 * - CSS ≤ 30KB … error（CI ブロック）
 * - JS ≤ 100KB（圧縮後）… warn（現状 Next.js ランタイム超過。削減は別作業）
 * - 合計 ≤ 500KB … warn
 *
 * 4 カテゴリ（目標 100。仕様は「少なくとも 95 以上を維持」）:
 * - performance / accessibility / seo … 実測 1.0 → error（minScore 1）
 * - best-practices … 実測 0.96 → 目標 100 未達のため warn（minScore 1）
 *
 * 実測ログ: 2026-09-02 `npm run lighthouse` → `.lighthouseci/lhr-*.json`
 * CI 組み込みは ci.yml（#9）。本ファイルは閾値。
 * CI ランナーでは単発計測が揺れやすいため numberOfRuns=3 + median（#9）。
 *
 * 実行: `npm run lighthouse`（内部で build → lhci autorun）
 */
module.exports = {
  ci: {
    collect: {
      staticDistDir: "./out",
      url: ["http://localhost/"],
      numberOfRuns: 3,
      settings: {
        // 防災サイトはモバイル想定が強いが、予算監視は desktop 固定で再現性を優先
        preset: "desktop",
      },
    },
    assert: {
      assertions: {
        "categories:performance": [
          "error",
          { minScore: 1, aggregationMethod: "median" },
        ],
        "categories:accessibility": [
          "error",
          { minScore: 1, aggregationMethod: "median" },
        ],
        "categories:best-practices": [
          "warn",
          { minScore: 1, aggregationMethod: "median" },
        ],
        "categories:seo": [
          "error",
          { minScore: 1, aggregationMethod: "median" },
        ],
        "resource-summary:document:size": [
          "error",
          { maxNumericValue: 50 * 1024, aggregationMethod: "median" },
        ],
        "resource-summary:stylesheet:size": [
          "error",
          { maxNumericValue: 30 * 1024, aggregationMethod: "median" },
        ],
        "resource-summary:script:size": [
          "warn",
          { maxNumericValue: 100 * 1024, aggregationMethod: "median" },
        ],
        "resource-summary:total:size": [
          "warn",
          { maxNumericValue: 500 * 1024, aggregationMethod: "median" },
        ],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci",
    },
  },
};
