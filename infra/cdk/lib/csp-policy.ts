/**
 * CloudFront Response Headers Policy 用の CSP 文字列組み立て（5.8.2）。
 *
 * インライン script は postbuild で外部化済みのため hash / nonce / 'strict-dynamic' は使わない。
 * 'strict-dynamic' を付けない理由: 静的 export の parser-inserted な外部 chunk <script>
 * （nonce/integrity 無し）がすべてブロックされサイトが壊れるため。
 *
 * 仕様 5.8.2 の括弧書き「nonce または hash と 'strict-dynamic'」は字義どおりには満たさないが、
 * 検証可能な MUST（ヘッダ送出・default-src 'none'・unsafe 系 / ワイルドカード禁止）は満たす
 * （課長裁可済み・issue #6）。
 */

export type CspExtraSources = {
  /** img-src に追加するホスト（例: 地図タイル）。#3 着手時に確認 */
  imgSrc?: string[];
  /** connect-src に追加するホスト（例: GeonicDB / タイル API） */
  connectSrc?: string[];
  /** font-src に追加するホスト */
  fontSrc?: string[];
  /** style-src に追加するホスト（原則自ホスト。追加は慎重に） */
  styleSrc?: string[];
  /** worker-src（地図導入時は 'self' blob: 等）。未指定ならディレクティブ省略 */
  workerSrc?: string[];
  /** child-src（地図導入時は blob: 等）。未指定ならディレクティブ省略 */
  childSrc?: string[];
  /**
   * script-src への追加ホスト prop は意図的に用意しない。
   * Geolonia Maps は npm バンドルで自ホスト配信の設計のため不要、という理解。
   * #3 着手時に再確認すること（docs/deployment.md）。
   */
};

export type BuildCspOptions = CspExtraSources & {
  /** true のとき呼び出し側は Content-Security-Policy-Report-Only として送出する */
  reportOnly?: boolean;
  /** report-uri / report-to 用。収集基盤の実装は #6 スコープ外 */
  reportUri?: string;
};

const DEFAULT_DIRECTIVES: Record<string, string[]> = {
  "default-src": ["'none'"],
  "script-src": ["'self'"],
  "style-src": ["'self'"],
  "img-src": ["'self'"],
  "font-src": ["'self'"],
  "connect-src": ["'self'"],
  "manifest-src": ["'self'"],
  "object-src": ["'none'"],
  "base-uri": ["'none'"],
  "form-action": ["'self'"],
  "frame-ancestors": ["'none'"],
};

function mergeSources(base: string[], extra: string[] | undefined): string[] {
  if (!extra || extra.length === 0) {
    return base;
  }
  const seen = new Set(base);
  const out = [...base];
  for (const src of extra) {
    const trimmed = src.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    // ワイルドカードオリジンは仕様 MUST 違反になりうるため拒否
    if (trimmed === "*" || trimmed.includes("*")) {
      throw new Error(`CSP source must not contain wildcards: ${trimmed}`);
    }
    if (/[;\r\n]/.test(trimmed)) {
      throw new Error(`CSP source must not contain ; or newlines: ${trimmed}`);
    }
    if (
      trimmed.includes("'unsafe-inline'") ||
      trimmed.includes("'unsafe-eval'")
    ) {
      throw new Error(`CSP source must not enable unsafe-*: ${trimmed}`);
    }
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

/**
 * 固定ベース + 追加ホストから CSP ヘッダ値を組み立てる。
 */
export function buildContentSecurityPolicy(
  options: BuildCspOptions = {},
): string {
  const directives: Record<string, string[]> = {
    "default-src": [...DEFAULT_DIRECTIVES["default-src"]],
    "script-src": [...DEFAULT_DIRECTIVES["script-src"]],
    "style-src": mergeSources(
      DEFAULT_DIRECTIVES["style-src"],
      options.styleSrc,
    ),
    "img-src": mergeSources(DEFAULT_DIRECTIVES["img-src"], options.imgSrc),
    "font-src": mergeSources(DEFAULT_DIRECTIVES["font-src"], options.fontSrc),
    "connect-src": mergeSources(
      DEFAULT_DIRECTIVES["connect-src"],
      options.connectSrc,
    ),
    "manifest-src": [...DEFAULT_DIRECTIVES["manifest-src"]],
    "object-src": [...DEFAULT_DIRECTIVES["object-src"]],
    "base-uri": [...DEFAULT_DIRECTIVES["base-uri"]],
    "form-action": [...DEFAULT_DIRECTIVES["form-action"]],
    "frame-ancestors": [...DEFAULT_DIRECTIVES["frame-ancestors"]],
  };

  if (options.workerSrc && options.workerSrc.length > 0) {
    directives["worker-src"] = mergeSources([], options.workerSrc);
  }
  if (options.childSrc && options.childSrc.length > 0) {
    directives["child-src"] = mergeSources([], options.childSrc);
  }

  const parts = Object.entries(directives).map(
    ([name, values]) => `${name} ${values.join(" ")}`,
  );
  parts.push("upgrade-insecure-requests");

  if (options.reportUri?.trim()) {
    parts.push(`report-uri ${options.reportUri.trim()}`);
  }

  return parts.join("; ");
}

/** ドキュメント・テスト用の既定 CSP（追加ホストなし・強制モード想定） */
export const DEFAULT_CSP = buildContentSecurityPolicy();
