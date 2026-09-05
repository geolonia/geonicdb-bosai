import type { MetadataRoute } from "next";
import { buildWebManifest } from "@/lib/pwa-manifest";

/** 静的 export（output: "export"）では metadata route も force-static が必須。 */
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return buildWebManifest(process.env.NEXT_PUBLIC_BASE_PATH);
}
