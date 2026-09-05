/**
 * 静的 export 後の Web App Manifest / apple-touch-icon が
 * NEXT_PUBLIC_BASE_PATH を反映していることを検証する（#41）。
 *
 * usage: node scripts/assert-pwa-manifest.mjs [outDir]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.resolve(process.argv[2] || path.join(root, "out"));

function normalizeBasePath(raw) {
  const trimmed = (raw ?? "").trim();
  if (!trimmed || trimmed === "/") return "";
  const withLeading = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeading.replace(/\/+$/, "");
}

function fail(message) {
  console.error(`assert-pwa-manifest: ${message}`);
  process.exit(1);
}

function findManifestFile(dir) {
  const candidates = [
    "manifest.webmanifest",
    "manifest.json",
    path.join("manifest.webmanifest", "index.html"), // unlikely
  ];
  for (const name of candidates) {
    const p = path.join(dir, name);
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  }
  // Next がハッシュ付きやネストする場合に備え走査
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    if (
      ent.isFile() &&
      (ent.name.endsWith(".webmanifest") || ent.name === "manifest.json")
    ) {
      return path.join(dir, ent.name);
    }
  }
  return null;
}

const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);
const expectedStart = basePath ? `${basePath}/` : "/";
const expectedIconPrefix = basePath ? `${basePath}/icons/` : "/icons/";
const expectedApple = basePath
  ? `${basePath}/icons/apple-touch-icon.png`
  : "/icons/apple-touch-icon.png";

if (!fs.existsSync(outDir)) {
  fail(`out directory missing: ${outDir}`);
}

const manifestPath = findManifestFile(outDir);
if (!manifestPath) {
  fail(`manifest not found under ${outDir}`);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
} catch (err) {
  fail(`failed to parse ${manifestPath}: ${err}`);
}

if (manifest.start_url !== expectedStart) {
  fail(
    `start_url=${JSON.stringify(manifest.start_url)} expected ${JSON.stringify(expectedStart)}`,
  );
}
if (manifest.scope !== expectedStart) {
  fail(
    `scope=${JSON.stringify(manifest.scope)} expected ${JSON.stringify(expectedStart)}`,
  );
}
const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
for (const expectedIcon of [
  `${expectedIconPrefix}icon-192.png`,
  `${expectedIconPrefix}icon-512.png`,
]) {
  if (!icons.some((icon) => icon.src === expectedIcon)) {
    fail(`required manifest icon missing: ${expectedIcon}`);
  }
}
for (const icon of icons) {
  if (!String(icon.src).startsWith(expectedIconPrefix)) {
    fail(`icon src ${icon.src} missing prefix ${expectedIconPrefix}`);
  }
  if (basePath && String(icon.src).includes(`${basePath}${basePath}/`)) {
    fail(`icon src double-prefixed: ${icon.src}`);
  }
}

const htmlPath = path.join(outDir, "index.html");
if (!fs.existsSync(htmlPath)) {
  fail(`index.html missing: ${htmlPath}`);
}
const html = fs.readFileSync(htmlPath, "utf8");
if (!html.includes("apple-touch-icon")) {
  fail("apple-touch-icon link missing in index.html");
}
if (!html.includes(expectedApple)) {
  fail(
    `apple-touch-icon href does not include ${expectedApple} (basePath=${JSON.stringify(basePath)})`,
  );
}

console.log(
  `assert-pwa-manifest: ok (basePath=${JSON.stringify(basePath)}, manifest=${path.relative(root, manifestPath)})`,
);
