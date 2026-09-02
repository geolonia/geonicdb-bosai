/**
 * Postbuild: 静的 export のインライン <script>（JS）を外部ファイル化し、
 * Content-Security-Policy の script-src 'self' だけで動くようにする。
 *
 * - src 無し・JS 扱いの <script> のみ対象（JSON-LD 等のデータブロックは除外）
 * - async/defer は付けない（self.__next_f の実行順維持）
 * - 置換後に再走査し、残存があれば exit 1（fail-closed）
 *
 * 実行: next build の後（package.json の build から連結）
 */
import { createHash } from "node:crypto";
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_TAG_RE = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi;

/**
 * 開始タグの属性文字列をトークン化し、属性名がちょうど `src` のものがあるか判定する。
 * 属性値の中身（例: data-foo="something src=evil.js"）は見ない。
 *
 * @param {string} attrs `<script` 直後の属性部分（先頭空白を含みうる。`>` は含まない）
 * @returns {boolean}
 */
export function hasSrcAttribute(attrs) {
  const ATTR_TOKEN_RE =
    /([a-zA-Z_:][a-zA-Z0-9_.:-]*)\s*(?:=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?/g;
  let match;
  while ((match = ATTR_TOKEN_RE.exec(attrs)) !== null) {
    if (match[1].toLowerCase() === "src") {
      return true;
    }
  }
  return false;
}

/**
 * @param {string | undefined} attrs
 * @returns {boolean}
 */
export function isExternalizableJsScript(attrs) {
  const a = attrs ?? "";
  if (hasSrcAttribute(a)) {
    return false;
  }
  const typeMatch = a.match(/\btype\s*=\s*(["'])([^"']*)\1/i);
  if (!typeMatch) {
    return true;
  }
  const type = typeMatch[2].trim().toLowerCase();
  return (
    type === "" ||
    type === "text/javascript" ||
    type === "application/javascript" ||
    type === "module"
  );
}

/**
 * @param {string} html
 * @returns {{ index: number, attrs: string, body: string, full: string }[]}
 */
export function findExternalizableInlineScripts(html) {
  /** @type {{ index: number, attrs: string, body: string, full: string }[]} */
  const found = [];
  SCRIPT_TAG_RE.lastIndex = 0;
  let match;
  while ((match = SCRIPT_TAG_RE.exec(html)) !== null) {
    const attrs = match[1] ?? "";
    const body = match[2] ?? "";
    if (!isExternalizableJsScript(attrs)) {
      continue;
    }
    found.push({
      index: match.index,
      attrs,
      body,
      full: match[0],
    });
  }
  return found;
}

/**
 * @param {string} content
 * @returns {string}
 */
export function contentHash(content) {
  return createHash("sha256")
    .update(content, "utf8")
    .digest("hex")
    .slice(0, 16);
}

/**
 * @param {string} html
 * @param {{ basePath?: string, writeFile: (relPath: string, body: string) => string }} opts
 *   writeFile は `_next/csp-inline/<hash>.js` 相対パスと本文を受け取り、HTML に埋める src パスを返す
 * @returns {{ html: string, files: { relPath: string, body: string }[], replaced: number }}
 */
export function externalizeInlineScriptsInHtml(html, opts) {
  const matches = findExternalizableInlineScripts(html);
  /** @type {{ relPath: string, body: string }[]} */
  const files = [];
  let result = html;
  // 後ろから置換してインデックスずれを防ぐ
  for (let i = matches.length - 1; i >= 0; i -= 1) {
    const m = matches[i];
    const hash = contentHash(m.body);
    const relPath = `_next/csp-inline/${hash}.js`;
    const srcPath = opts.writeFile(relPath, m.body);
    const replacement = `<script src="${srcPath}"></script>`;
    result =
      result.slice(0, m.index) +
      replacement +
      result.slice(m.index + m.full.length);
    files.push({ relPath, body: m.body });
  }
  return { html: result, files, replaced: matches.length };
}

/**
 * @param {string} dir
 * @returns {string[]}
 */
export function listHtmlFiles(dir) {
  /** @type {string[]} */
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...listHtmlFiles(full));
    } else if (name.endsWith(".html")) {
      out.push(full);
    }
  }
  return out;
}

/**
 * @param {string} outDir
 * @param {{ basePath?: string }} [options]
 */
export function externalizeOutDirectory(outDir, options = {}) {
  const basePath = (options.basePath ?? "").replace(/\/$/, "");
  const written = new Map();
  const htmlFiles = listHtmlFiles(outDir);
  let totalReplaced = 0;

  for (const htmlPath of htmlFiles) {
    const original = readFileSync(htmlPath, "utf8");
    const { html, replaced } = externalizeInlineScriptsInHtml(original, {
      basePath,
      writeFile(relPath, body) {
        if (!written.has(relPath)) {
          const abs = path.join(outDir, relPath);
          mkdirSync(path.dirname(abs), { recursive: true });
          writeFileSync(abs, body, "utf8");
          written.set(relPath, body);
        }
        return `${basePath}/${relPath}`.replace(/\/{2,}/g, "/");
      },
    });
    if (replaced > 0) {
      writeFileSync(htmlPath, html, "utf8");
      totalReplaced += replaced;
    }
  }

  // fail-closed: 置換後も src 無し JS script が残っていれば失敗
  /** @type {string[]} */
  const leftovers = [];
  for (const htmlPath of listHtmlFiles(outDir)) {
    const remaining = findExternalizableInlineScripts(
      readFileSync(htmlPath, "utf8"),
    );
    if (remaining.length > 0) {
      leftovers.push(
        `${path.relative(outDir, htmlPath)}: ${remaining.length} inline script(s)`,
      );
    }
  }
  if (leftovers.length > 0) {
    throw new Error(
      `externalize-inline-scripts: inline JS <script> still present after rewrite:\n${leftovers.join("\n")}`,
    );
  }

  return {
    htmlFiles: htmlFiles.length,
    replaced: totalReplaced,
    files: written.size,
  };
}

function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const outDir = path.join(root, "out");
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || "";
  try {
    const result = externalizeOutDirectory(outDir, { basePath });
    console.log(
      `externalize-inline-scripts: replaced ${result.replaced} script(s) across ${result.htmlFiles} HTML file(s); wrote ${result.files} unique file(s)`,
    );
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}

const isDirectRun =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isDirectRun) {
  main();
}
