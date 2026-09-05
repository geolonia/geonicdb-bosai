/**
 * Web Push 購読プロキシ（#35 / #36）のレート制限・同時実行上限。
 *
 * 閾値の根拠:
 * - WAF 120 req / IP / 5 分（evaluationWindowSec=300 を明示）: **CloudFront フル
 *   デプロイ時のみ**有効。正当な購読・解除の再試行を通しつつ量産を抑える。
 * - Lambda reserved concurrency 50: Function URL 単体運用（GitHub Pages）では
 *   **主たる防御**。CloudFront 併用時は粗いコスト上限の backstop。
 *   値を小さくしすぎると災害時の正規購読急増で住民を締め出しうる。
 *   Function URL 直叩きの完全な分離・遮断は本 PR スコープ外（future follow-up）。
 */

/** WAF RateBasedStatement: IP あたり評価窓内の上限リクエスト数 */
export const WEBPUSH_RATE_LIMIT_PER_5_MIN = 120;

/**
 * WAF RateBasedStatement の評価窓（秒）。AWS 既定は 300。
 * デフォルト依存を避けるため明示し、テストで固定する。
 */
export const WEBPUSH_RATE_LIMIT_EVALUATION_WINDOW_SEC = 300;

/** ScopeDown: この URI プレフィックスに一致するリクエストのみレート制限対象 */
export const WEBPUSH_RATE_LIMIT_URI_PREFIX = "/api/webpush";

/**
 * Lambda reservedConcurrentExecutions。
 * Function URL 単体では主防御、CloudFront+WAF 併用時は粗いコスト上限。災害時急増を
 * 締め出さないよう 50。
 */
export const WEBPUSH_LAMBDA_RESERVED_CONCURRENCY = 50;
