import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * GeonicDB `globToRegexSource`（`policy.pdp.ts`）と同等の変換。
 * bosai 側に本体実装は無いため、ポリシー例の回帰用にセマンティクスを固定する。
 * `*` → `[^/]*`（スラッシュ非跨ぎ）、`/**` → `(/.*)?`（ベースパス自身にもマッチ）。
 */
function globToRegexSource(matchValue: string): string {
  return matchValue
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\/\*\*/g, "@@SLASHDOUBLESTAR@@")
    .replace(/\*\*/g, "@@DOUBLESTAR@@")
    .replace(/\*/g, "[^/]*")
    .replace(/@@SLASHDOUBLESTAR@@/g, "(/.*)?")
    .replace(/@@DOUBLESTAR@@/g, ".*");
}

function globMatches(pattern: string, path: string): boolean {
  return new RegExp(`^${globToRegexSource(pattern)}$`).test(path);
}

/** 同一 attributeId 内は OR（GeonicDB matchAttributeGroup）。 */
function pathPermitted(
  matchers: ReadonlyArray<{ matchValue: string; matchFunction: string }>,
  path: string,
): boolean {
  return matchers.some((m) => {
    if (m.matchFunction === "string-equal") {
      return path === m.matchValue;
    }
    if (m.matchFunction === "glob") {
      return globMatches(m.matchValue, path);
    }
    return false;
  });
}

const COLLECTION = "/ngsi-ld/v1/subscriptions";
const MEMBER = "/ngsi-ld/v1/subscriptions/urn:ngsi-ld:Subscription:abc";

/** #51 で採用した permit-subscription-write の resources（docs と一致必須）。 */
const CORRECT_RESOURCES = [
  {
    attributeId: "path",
    matchValue: "/ngsi-ld/v1/subscriptions",
    matchFunction: "string-equal",
  },
  {
    attributeId: "path",
    matchValue: "/ngsi-ld/v1/subscriptions/**",
    matchFunction: "glob",
  },
] as const;

const BUG_PATTERN = "/ngsi-ld/v1/subscriptions*";

describe("Web Push policy path glob (#51)", () => {
  it("buggy subscriptions* matches collection POST but not member DELETE (repro)", () => {
    expect(globMatches(BUG_PATTERN, COLLECTION)).toBe(true);
    expect(globMatches(BUG_PATTERN, MEMBER)).toBe(false);
  });

  it("correct dual matchers permit both collection and member paths", () => {
    expect(pathPermitted(CORRECT_RESOURCES, COLLECTION)).toBe(true);
    expect(pathPermitted(CORRECT_RESOURCES, MEMBER)).toBe(true);
  });

  it("near-miss: subscriptions* falsely matches same-segment suffix, still misses slash id", () => {
    expect(globMatches(BUG_PATTERN, "/ngsi-ld/v1/subscriptionsX")).toBe(true);
    expect(globMatches(BUG_PATTERN, MEMBER)).toBe(false);
    expect(pathPermitted(CORRECT_RESOURCES, "/ngsi-ld/v1/subscriptionsX")).toBe(
      false,
    );
  });

  it("docs publish the correct resources and warn about slash-crossing *", () => {
    const docsPath = join(
      dirname(fileURLToPath(import.meta.url)),
      "../../docs/geonicdb-setup.md",
    );
    const docs = readFileSync(docsPath, "utf8");

    expect(docs).toContain(
      '"matchValue": "/ngsi-ld/v1/subscriptions", "matchFunction": "string-equal"',
    );
    expect(docs).toContain(
      '"matchValue": "/ngsi-ld/v1/subscriptions/**", "matchFunction": "glob"',
    );
    // 誤った matchValue をポリシー JSON 例に再混入させない（説明文の BUG_PATTERN 言及は可）
    const policyJsonBlock = docs.slice(
      docs.indexOf('"ruleId": "permit-subscription-write"'),
      docs.indexOf('"ruleId": "permit-bosai-read-for-notification-authz"'),
    );
    expect(policyJsonBlock).not.toContain(`"matchValue": "${BUG_PATTERN}"`);
    expect(docs).toMatch(/スラッシュを跨がない/);
  });
});
