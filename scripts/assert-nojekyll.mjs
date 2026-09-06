/**
 * 静的 export 後に .nojekyll が out/ に残っていることを検証する（#69）。
 * 欠けると GitHub Pages が Jekyll を有効化し _next/ が 404 になる。
 *
 * usage: node scripts/assert-nojekyll.mjs [outDir]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.resolve(process.argv[2] || path.join(root, "out"));

const marker = path.join(outDir, ".nojekyll");
if (!fs.existsSync(marker) || !fs.statSync(marker).isFile()) {
  console.error(
    `assert-nojekyll: missing ${marker} (public/.nojekyll must be copied into the static export)`,
  );
  process.exit(1);
}

console.log(`assert-nojekyll: ok (${marker})`);
