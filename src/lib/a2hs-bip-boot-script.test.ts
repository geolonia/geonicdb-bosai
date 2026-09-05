import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { A2HS_BIP_BOOT_SCRIPT } from "@/lib/a2hs-bip-boot-script";
import {
  contentHash,
  externalizeInlineScriptsInHtml,
} from "../../scripts/externalize-inline-scripts.mjs";

const layoutSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../app/layout.tsx"),
  "utf8",
);

describe("a2hs BIP boot script (#60 / CSP)", () => {
  it("is embedded as inline script in layout (not a sync src script)", () => {
    expect(layoutSource).toMatch(/dangerouslySetInnerHTML/);
    expect(layoutSource).toMatch(/A2HS_BIP_BOOT_SCRIPT/);
    expect(layoutSource).not.toMatch(/a2hs-bip-boot\.js/);
    expect(layoutSource).not.toMatch(/<script\s+src=\{/);
  });

  it("externalizes to csp-inline without async/defer (script-src 'self')", () => {
    const html = `<html><head><script>${A2HS_BIP_BOOT_SCRIPT}</script></head></html>`;
    const written: { relPath: string; body: string }[] = [];
    const { html: out, replaced } = externalizeInlineScriptsInHtml(html, {
      writeFile(relPath, body) {
        written.push({ relPath, body });
        return `/${relPath}`;
      },
    });
    expect(replaced).toBe(1);
    expect(written).toHaveLength(1);
    expect(written[0]?.relPath).toBe(
      `_next/csp-inline/${contentHash(A2HS_BIP_BOOT_SCRIPT)}.js`,
    );
    expect(written[0]?.body).toContain("__bosaiA2hsBipBootstrapped");
    expect(out).toMatch(
      /<script src="\/_next\/csp-inline\/[a-f0-9]+\.js"><\/script>/,
    );
    expect(out).not.toMatch(/\basync\b/);
    expect(out).not.toMatch(/\bdefer\b/);
    // インライン本文は残らない
    expect(out).not.toContain("__bosaiA2hsBipBootstrapped");
  });
});
