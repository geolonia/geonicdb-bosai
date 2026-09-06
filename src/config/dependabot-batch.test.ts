import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

/**
 * issue #69: vitest 4 / Actions batch と、Pages 成果物の .nojekyll 脱落防止。
 */
describe("dependabot / Actions batch (#69)", () => {
  const packageJson = JSON.parse(read("package.json")) as {
    devDependencies: Record<string, string>;
  };
  const cdkPackageJson = JSON.parse(read("infra/cdk/package.json")) as {
    devDependencies: Record<string, string>;
  };
  const ci = read(".github/workflows/ci.yml");
  const deploy = read(".github/workflows/deploy-pages.yml");

  it("pins vitest 4 at root and cdk", () => {
    expect(packageJson.devDependencies.vitest).toMatch(/^(\^)?4\./);
    expect(cdkPackageJson.devDependencies.vitest).toMatch(/^(\^)?4\./);
  });

  it("uses Actions majors from the batch", () => {
    expect(ci).toMatch(/actions\/setup-node@v7/);
    expect(deploy).toMatch(/actions\/setup-node@v7/);
    expect(deploy).toMatch(/actions\/configure-pages@v6/);
    expect(deploy).toMatch(/actions\/upload-pages-artifact@v5/);
    expect(ci).not.toMatch(/actions\/setup-node@v4/);
    expect(deploy).not.toMatch(/actions\/setup-node@v4/);
  });

  it("keeps include-hidden-files when upload-pages-artifact is v4+", () => {
    // v4+ は dotfile をデフォルト除外。.nojekyll 脱落 → Jekyll → _next/ 404。
    const upload = deploy.match(
      /uses:\s*actions\/upload-pages-artifact@(v\d+)([\s\S]*?)(?=\n\s{0,6}-\s+name:|\n\s{0,2}\w|$)/,
    );
    expect(upload).not.toBeNull();
    const major = Number(upload![1].slice(1));
    expect(major).toBeGreaterThanOrEqual(4);
    expect(upload![2]).toMatch(/include-hidden-files:\s*true/);
  });

  it("ships public/.nojekyll so the static export can disable Jekyll", () => {
    const marker = path.join(root, "public", ".nojekyll");
    expect(fs.existsSync(marker)).toBe(true);
    expect(fs.statSync(marker).isFile()).toBe(true);
  });
});
