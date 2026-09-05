/**
 * CDK context / props 用の絶対 http(s) URL 検証。
 * 相対パスを渡すと生の URL コンストラクタ例外ではなく明示エラーにする。
 */

function rejectRelativeOrInvalid(trimmed: string, paramName: string): URL {
  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("./") ||
    trimmed.startsWith("../")
  ) {
    throw new Error(
      `${paramName} must be an absolute http(s) URL (got relative path: ${trimmed}).`,
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(
      `${paramName} must be a valid absolute http(s) URL (got: ${trimmed})`,
    );
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(
      `${paramName} must use http or https (got: ${parsed.protocol})`,
    );
  }

  return parsed;
}

/** 絶対 http(s) URL を検証し、末尾スラッシュを除いた URL 文字列を返す */
export function assertAbsoluteHttpUrl(
  raw: string | undefined,
  paramName: string,
): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return undefined;
  }
  rejectRelativeOrInvalid(trimmed, paramName);
  return trimmed.replace(/\/+$/, "");
}

/** 絶対 http(s) URL の origin（CSP connect-src / CORS 用） */
export function assertAbsoluteHttpOrigin(
  raw: string | undefined,
  paramName: string,
): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return undefined;
  }
  return rejectRelativeOrInvalid(trimmed, paramName).origin;
}
