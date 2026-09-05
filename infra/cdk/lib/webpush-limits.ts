/**
 * Web Push 購読プロキシ（#35 / #36）のレート制限・同時実行上限。
 *
 * 閾値の根拠:
 * - WAF 120 req / IP / 5 分: 正当な購読・解除・再試行（数回〜十数回）を通しつつ、
 *   スクリプトによるサブスクリプション量産を抑える。AWS WAF rate-based の評価窓は既定 5 分。
 * - Lambda reserved concurrency 5: CloudFront 経由を迂回した Function URL 直叩きへの
 *   defense-in-depth。自治体サイトの想定同時購読数に対して十分な余力を残しつつ枯渇を抑える。
 */

/** WAF RateBasedStatement: IP あたり 5 分間の上限リクエスト数 */
export const WEBPUSH_RATE_LIMIT_PER_5_MIN = 120;

/** ScopeDown: この URI プレフィックスに一致するリクエストのみレート制限対象 */
export const WEBPUSH_RATE_LIMIT_URI_PREFIX = "/api/webpush";

/** Lambda reservedConcurrentExecutions（Function URL 直叩きのバックストップ） */
export const WEBPUSH_LAMBDA_RESERVED_CONCURRENCY = 5;
