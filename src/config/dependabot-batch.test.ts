import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

/**
 * issue #69 / #70: major を部分取り込みしたあと、見送ったパッケージが
 * dependabot から再送されないこと、および入れた Actions / vitest の版を固定する。
 */
describe("dependabot / Actions batch (#69)", () => {
  const dependabot = read(".github/dependabot.yml");
  const packageJson = JSON.parse(read("package.json")) as {
    devDependencies: Record<string, string>;
  };
  const cdkPackageJson = JSON.parse(read("infra/cdk/package.json")) as {
    devDependencies: Record<string, string>;
  };
  const ci = read(".github/workflows/ci.yml");
  const deploy = read(".github/workflows/deploy-pages.yml");

  it("ignores deferred majors with tracking issue #70 in comments", () => {
    expect(dependabot).toMatch(/#70/);
    expect(dependabot).toMatch(
      /dependency-name:\s*typescript[\s\S]*?versions:\s*\["\>=7"\]/,
    );
    expect(dependabot).toMatch(
      /dependency-name:\s*eslint[\s\S]*?versions:\s*\["\>=10"\]/,
    );
    expect(dependabot).toMatch(
      /dependency-name:\s*"@types\/node"[\s\S]*?versions:\s*\["\>=23"\]/,
    );
  });

  it("does not ignore current typescript 5 / eslint 9 patch range (near-miss)", () => {
    // >=6 や >=9 だと現行の許可レンジまで塞ぐ。閾値は「次の major だけ」。
    expect(dependabot).not.toMatch(
      /dependency-name:\s*typescript[\s\S]*?versions:\s*\["\>=6"\]/,
    );
    expect(dependabot).not.toMatch(
      /dependency-name:\s*eslint[\s\S]*?versions:\s*\["\>=9"\]/,
    );
    // Node 22 系の型（@types/node@22）までは上げられる余地を残す
    expect(dependabot).not.toMatch(
      /dependency-name:\s*"@types\/node"[\s\S]*?versions:\s*\["\>=22"\]/,
    );
  });

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
});
