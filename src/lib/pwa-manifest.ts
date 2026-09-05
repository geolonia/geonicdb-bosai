import type { MetadataRoute } from "next";

/** NEXT_PUBLIC_BASE_PATH を正規化（先頭 `/`・末尾スラッシュなし。空なら ""）。 */
export function normalizeBasePath(raw: string | undefined): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed || trimmed === "/") return "";
  const withLeading = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeading.replace(/\/+$/, "");
}

/** basePath 配下の絶対パス（アプリ内ルート）を組み立てる。 */
export function withBasePath(pathname: string, basePath: string): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (!basePath) return path;
  if (path === "/") return `${basePath}/`;
  return `${basePath}${path}`;
}

/**
 * Web App Manifest を生成する。
 * gh-pages (`/geonicdb-bosai`) では start_url / scope / icons に basePath が必須。
 */
export function buildWebManifest(basePathRaw?: string): MetadataRoute.Manifest {
  const basePath = normalizeBasePath(basePathRaw);
  const icon192 = withBasePath("/icons/icon-192.png", basePath);
  const icon512 = withBasePath("/icons/icon-512.png", basePath);

  return {
    name: "防災情報",
    short_name: "防災情報",
    description: "自治体向け防災サイトテンプレート",
    start_url: withBasePath("/", basePath),
    scope: withBasePath("/", basePath),
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#1a1a1a",
    lang: "ja",
    icons: [
      {
        src: icon192,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: icon192,
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: icon512,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: icon512,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
