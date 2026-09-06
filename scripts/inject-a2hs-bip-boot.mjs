/**
 * postbuild: BIP 早期捕捉スクリプトを out/*.html の <head> 先頭へ挿入する（#55 / #60）。
 *
 * layout にインライン埋め込みすると RSC ペイロードへ本文が重複し、
 * Lighthouse script.size / performance を押し下げる実測がある。
 * public/a2hs-bip-boot.js を参照する <script src>（async/defer 無し）を挿入し、
 * CSP script-src 'self' のまま React より前に実行する。
 */
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const BOOT_FILE = "a2hs-bip-boot.js";
const MARKER = "data-bosai-a2hs-bip-boot";

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
 * @param {string} html
 * @param {string} scriptSrc
 * @returns {{ html: string, injected: boolean }}
 */
export function injectA2hsBipBootScript(html, scriptSrc) {
  if (html.includes(MARKER)) {
    return { html, injected: false };
  }
  const tag = `<script ${MARKER} src="${scriptSrc}"></script>`;
  // CSS より後（</head> 直前）へ入れる。先頭だと同期 script が CSS を遅らせ FOUC の温床になる。
  // BIP はページ読込後に発火することが多く、</head> 直前で十分捕捉できる。
  const withHead = html.replace(/<\/head>/i, `${tag}</head>`);
  if (withHead === html) {
    throw new Error("inject-a2hs-bip-boot: </head> not found");
  }
  return { html: withHead, injected: true };
}

/**
 * @param {string} outDir
 * @param {{ basePath?: string }} [options]
 */
export function injectA2hsBipBootIntoOut(outDir, options = {}) {
  const basePath = (options.basePath ?? "").replace(/\/$/, "");
  const bootPath = path.join(outDir, BOOT_FILE);
  if (!existsSync(bootPath)) {
    throw new Error(
      `inject-a2hs-bip-boot: missing ${BOOT_FILE} in out/ (public copy failed?)`,
    );
  }
  const scriptSrc = `${basePath}/${BOOT_FILE}`.replace(/\/{2,}/g, "/");
  let injected = 0;
  for (const htmlPath of listHtmlFiles(outDir)) {
    const original = readFileSync(htmlPath, "utf8");
    const { html, injected: did } = injectA2hsBipBootScript(
      original,
      scriptSrc,
    );
    if (did) {
      writeFileSync(htmlPath, html, "utf8");
      injected += 1;
    }
  }
  return { htmlFiles: listHtmlFiles(outDir).length, injected, scriptSrc };
}

function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const outDir = path.join(root, "out");
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || "";
  try {
    const result = injectA2hsBipBootIntoOut(outDir, { basePath });
    console.log(
      `inject-a2hs-bip-boot: injected into ${result.injected}/${result.htmlFiles} HTML file(s) src=${result.scriptSrc}`,
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
