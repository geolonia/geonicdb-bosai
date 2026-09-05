/**
 * コミット済み `public/sw.js` が正本から再生成した結果と一致することを検証する（#42）。
 * `scripts/assert-pwa-manifest.mjs` と同様、`npm run build` 後段で fail-closed。
 *
 * usage: node scripts/assert-sw-fresh.mjs
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const committedPath = path.join(root, "public/sw.js");

function fail(message) {
  console.error(`assert-sw-fresh: ${message}`);
  process.exit(1);
}

const { buildServiceWorkerSource } = await import(
  pathToFileURL(path.join(__dirname, "generate-sw.mjs")).href
);

if (!fs.existsSync(committedPath)) {
  fail(`missing ${path.relative(root, committedPath)} — run npm run generate:sw`);
}

const expected = buildServiceWorkerSource();
const actual = fs.readFileSync(committedPath, "utf8").replace(/\r\n/g, "\n");

if (actual === expected) {
  console.log("assert-sw-fresh: public/sw.js matches generate-sw output");
  process.exit(0);
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "assert-sw-fresh-"));
const expectedPath = path.join(tmpDir, "sw.expected.js");
fs.writeFileSync(expectedPath, expected, "utf8");

fail(
  `public/sw.js is stale or was hand-edited.\n` +
    `  Run: npm run generate:sw\n` +
    `  Expected written to: ${expectedPath}`,
);
