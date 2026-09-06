import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { normalizeBasePath, withBasePath } from "@/lib/pwa-manifest";
import "./globals.css";

const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);

/**
 * icons / apple-touch-icon も basePath を明示する。
 * 静的 export + Metadata API では HTML の href に basePath が自動付与されない
 *（実測: Next 16.3.4）。manifest 本文も同様に MetadataRoute は書き換えない。
 */
export const metadata: Metadata = {
  title: "防災情報 | geonicdb-bosai",
  description: "自治体向け防災サイトテンプレート",
  applicationName: "防災情報",
  appleWebApp: {
    capable: true,
    title: "防災情報",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      {
        url: withBasePath("/icons/icon-192.png", basePath),
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: withBasePath("/icons/icon-512.png", basePath),
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: withBasePath("/icons/apple-touch-icon.png", basePath),
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1a1a",
  /** iOS safe-area-inset-* を有効化（A2HS fixed 帯の底余白に使用） */
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  // BIP boot は layout に埋め込まない（RSC 重複で LH が落ちる実測あり）。
  // postbuild scripts/inject-a2hs-bip-boot.mjs が public/a2hs-bip-boot.js を head へ挿入する。
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
