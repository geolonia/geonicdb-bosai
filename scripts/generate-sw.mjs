/**
 * `src/lib/web-push-sw-logic.ts` + `src/sw/service-worker.ts` から
 * 依存ゼロの `public/sw.js` を生成する（#42）。
 *
 * esbuild は使わず、logic をテキスト連結したうえで typescript.transpileModule する。
 *
 * usage:
 *   node scripts/generate-sw.mjs              # public/sw.js へ書き込み
 *   node scripts/generate-sw.mjs --stdout     # 標準出力
 *   node scripts/generate-sw.mjs --out PATH   # 指定パスへ書き込み
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const logicPath = path.join(root, "src/lib/web-push-sw-logic.ts");
const entryPath = path.join(root, "src/sw/service-worker.ts");
const defaultOutPath = path.join(root, "public/sw.js");

const BANNER = `/**
 * Push 受信専用 Service Worker（#35 / #41 / #45 / #42）。
 * fetch イベントは実装しない（オフラインキャッシュ禁止）。
 *
 * このファイルは生成物です。編集せず \`npm run generate:sw\` で再生成してください。
 * 正本: src/lib/web-push-sw-logic.ts + src/sw/service-worker.ts
 */
`;

/**
 * logic ソースを SW 連結用に整形する。
 * - ファイル先頭の説明コメントを除去
 * - import を除去（依存ゼロ前提）
 * - export を除去
 * - setAppBadgeSafely / clearAppBadgeSafely を WithNav 名へリネーム（エントリの import alias と一致）
 */
function prepareLogicSource(source) {
  let s = source;
  // 先頭ブロックコメント（ファイル説明）を除去
  s = s.replace(/^\/\*\*[\s\S]*?\*\/\s*/, "");
  s = s.replace(/^import\s+type\s+[^;]+;\s*/gm, "");
  s = s.replace(/^import\s+[^;]+;\s*/gm, "");
  s = s.replace(/^export\s+type\s+/gm, "type ");
  s = s.replace(/^export\s+async\s+function\s+/gm, "async function ");
  s = s.replace(/^export\s+function\s+/gm, "function ");
  s = s.replace(/^export\s+const\s+/gm, "const ");
  s = s.replace(/^export\s+/gm, "");

  s = s.replace(
    /\basync function setAppBadgeSafely\b/g,
    "async function setAppBadgeSafelyWithNav",
  );
  s = s.replace(
    /\basync function clearAppBadgeSafely\b/g,
    "async function clearAppBadgeSafelyWithNav",
  );

  return s.trim() + "\n";
}

/**
 * エントリから import / 三重スラッシュ参照 / declare self を除き、連結用本文だけにする。
 */
function prepareEntrySource(source) {
  let s = source;
  s = s.replace(/^\/\*\*[\s\S]*?\*\/\s*/, "");
  s = s.replace(/^\/\/\/\s*<reference[^>]*>\s*/gm, "");
  s = s.replace(/import\s+type\s+[^;]+;\s*/g, "");
  s = s.replace(/import\s+[\s\S]*?from\s+["'][^"']+["'];\s*/g, "");
  s = s.replace(/declare const self:[^;]+;\s*/g, "");
  return s.trim() + "\n";
}

export function buildServiceWorkerSource() {
  const logic = prepareLogicSource(fs.readFileSync(logicPath, "utf8"));
  const entry = prepareEntrySource(fs.readFileSync(entryPath, "utf8"));
  const combined = `${logic}\n${entry}`;

  const transpiled = ts.transpileModule(combined, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2017,
      module: ts.ModuleKind.None,
      removeComments: false,
      newLine: ts.NewLineKind.LineFeed,
      strict: true,
    },
    fileName: "service-worker.combined.ts",
    reportDiagnostics: true,
  });

  if (transpiled.diagnostics?.length) {
    const formatted = ts.formatDiagnosticsWithColorAndContext(
      transpiled.diagnostics,
      {
        getCurrentDirectory: () => root,
        getCanonicalFileName: (f) => f,
        getNewLine: () => "\n",
      },
    );
    throw new Error(`generate-sw: transpile failed\n${formatted}`);
  }

  // 生成結果は常に LF。末尾改行を 1 つに正規化。
  const body = transpiled.outputText
    .replace(/\r\n/g, "\n")
    .replace(/\s*$/, "\n");
  const source = `${BANNER}\n${body}`;
  assertClassicScriptOutput(source);
  return source;
}

/**
 * classic script として配信する SW に module 構文が残っていないことを fail-closed で検査する。
 * 静的 import 除去の正規表現漏れや dynamic `import()` → `require(...)` 変換の残留を黙殺しない。
 * コメント内の言及は無視する（バナーや説明文の false positive 防止）。
 */
export function assertClassicScriptOutput(source) {
  const withoutComments = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  const found = [];
  if (/\brequire\s*\(/.test(withoutComments)) found.push("require(");
  if (/\bimport\b/.test(withoutComments)) found.push("import");
  if (/\bexport\b/.test(withoutComments)) found.push("export");
  if (found.length > 0) {
    throw new Error(
      `generate-sw: output must be a classic script (no module syntax); found ${found.join(", ")}`,
    );
  }
}

function parseArgs(argv) {
  let out = defaultOutPath;
  let stdout = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--stdout") stdout = true;
    else if (arg === "--out") {
      out = path.resolve(argv[++i] ?? "");
      if (!out) throw new Error("generate-sw: --out requires a path");
    }
  }
  return { out, stdout };
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  try {
    const { out, stdout } = parseArgs(process.argv.slice(2));
    const source = buildServiceWorkerSource();
    if (stdout) {
      process.stdout.write(source);
    } else {
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, source, "utf8");
      console.log(`generate-sw: wrote ${path.relative(root, out)}`);
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
