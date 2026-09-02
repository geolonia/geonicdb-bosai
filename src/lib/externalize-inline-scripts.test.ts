import { createHash } from "node:crypto";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  externalizeInlineScriptsInHtml,
  externalizeOutDirectory,
  findExternalizableInlineScripts,
  isExternalizableJsScript,
} from "../../scripts/externalize-inline-scripts.mjs";

describe("isExternalizableJsScript", () => {
  it("treats default and explicit JS types as externalizable", () => {
    expect(isExternalizableJsScript("")).toBe(true);
    expect(isExternalizableJsScript(' type="module"')).toBe(true);
    expect(isExternalizableJsScript(' type="text/javascript"')).toBe(true);
  });

  it("skips scripts that already have src", () => {
    expect(isExternalizableJsScript(' src="/a.js"')).toBe(false);
  });

  it("still externalizes when only data-src is present (not a real src attr)", () => {
    expect(isExternalizableJsScript(' data-src="/x.js"')).toBe(true);
    const { html, replaced } = externalizeInlineScriptsInHtml(
      '<script data-src="x">boot()</script>',
      {
        writeFile(relPath) {
          return `/${relPath}`;
        },
      },
    );
    expect(replaced).toBe(1);
    expect(html).toMatch(
      /<script src="\/_next\/csp-inline\/[a-f0-9]{16}\.js"><\/script>/,
    );
    expect(html).not.toContain("boot()");
  });

  it("skips non-JS data blocks (near-miss: application/ld+json)", () => {
    expect(isExternalizableJsScript(' type="application/ld+json"')).toBe(false);
    expect(isExternalizableJsScript(' type="application/json"')).toBe(false);
  });
});

describe("externalizeInlineScriptsInHtml", () => {
  it("rewrites inline JS to hashed files and preserves order without async/defer", () => {
    const html =
      '<html><body><script>a()</script><script src="/x.js"></script><script>b()</script></body></html>';
    const written: { relPath: string; body: string }[] = [];
    const { html: out, replaced } = externalizeInlineScriptsInHtml(html, {
      basePath: "",
      writeFile(relPath, body) {
        written.push({ relPath, body });
        return `/${relPath}`;
      },
    });
    expect(replaced).toBe(2);
    expect(out).toContain('<script src="/_next/csp-inline/');
    expect(out).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/);
    expect(out).not.toMatch(/\basync\b|\bdefer\b/);
    // 置換は後ろから行うため write 順は逆。HTML 上の出現順は a → b を保つ
    expect(out.indexOf("a()")).toBe(-1);
    expect(written.map((w) => w.body).sort()).toEqual(["a()", "b()"]);
    const srcOrder = [...out.matchAll(/csp-inline\/([a-f0-9]{16})\.js/g)].map(
      (m) => m[1],
    );
    expect(srcOrder).toHaveLength(2);
    expect(srcOrder[0]).not.toBe(srcOrder[1]);
    const hashA = createHash("sha256")
      .update("a()", "utf8")
      .digest("hex")
      .slice(0, 16);
    const hashB = createHash("sha256")
      .update("b()", "utf8")
      .digest("hex")
      .slice(0, 16);
    expect(srcOrder).toEqual([hashA, hashB]);
  });

  it("prefixes basePath on src", () => {
    const { html } = externalizeInlineScriptsInHtml(
      "<script>hello()</script>",
      {
        basePath: "/geonicdb-bosai",
        writeFile(relPath) {
          return `/geonicdb-bosai/${relPath}`;
        },
      },
    );
    expect(html).toMatch(
      /<script src="\/geonicdb-bosai\/_next\/csp-inline\/[a-f0-9]{16}\.js"><\/script>/,
    );
  });

  it("leaves JSON-LD intact", () => {
    const html =
      '<script type="application/ld+json">{"@type":"Organization"}</script><script>boot()</script>';
    const { html: out } = externalizeInlineScriptsInHtml(html, {
      writeFile(relPath) {
        return `/${relPath}`;
      },
    });
    expect(out).toContain('type="application/ld+json"');
    expect(out).toContain('{"@type":"Organization"}');
    expect(findExternalizableInlineScripts(out)).toHaveLength(0);
  });
});

describe("externalizeOutDirectory", () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const d of dirs.splice(0)) {
      rmSync(d, { recursive: true, force: true });
    }
  });

  it("writes shared hash files and fail-closes if inline JS remains", () => {
    const root = mkdtempSync(path.join(tmpdir(), "csp-ext-"));
    dirs.push(root);
    writeFileSync(
      path.join(root, "index.html"),
      "<script>(self.__next_f=self.__next_f||[]).push([0])</script>",
    );
    mkdirSync(path.join(root, "sub"), { recursive: true });
    writeFileSync(
      path.join(root, "sub", "index.html"),
      "<script>(self.__next_f=self.__next_f||[]).push([0])</script>",
    );

    const result = externalizeOutDirectory(root, { basePath: "" });
    expect(result.replaced).toBe(2);
    expect(result.files).toBe(1);

    const body = "(self.__next_f=self.__next_f||[]).push([0])";
    const hash = createHash("sha256")
      .update(body, "utf8")
      .digest("hex")
      .slice(0, 16);
    const filePath = path.join(root, "_next", "csp-inline", `${hash}.js`);
    expect(readFileSync(filePath, "utf8")).toBe(body);
    expect(readFileSync(path.join(root, "index.html"), "utf8")).toContain(
      `src="/_next/csp-inline/${hash}.js"`,
    );
  });
});
