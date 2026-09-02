import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const lighthouserc = require(
  path.resolve(__dirname, "../../lighthouserc.js"),
) as {
  ci: {
    assert: {
      assertions: Record<
        string,
        [string, { minScore?: number; maxNumericValue?: number }]
      >;
    };
  };
};

describe("lighthouserc budgets (spec 5.8.4 / issue #6)", () => {
  const { assertions } = lighthouserc.ci.assert;

  it("blocks on HTML/CSS over budget and performance floor", () => {
    expect(assertions["categories:performance"]).toEqual([
      "error",
      { minScore: 0.95 },
    ]);
    expect(assertions["resource-summary:document:size"]).toEqual([
      "error",
      { maxNumericValue: 50 * 1024 },
    ]);
    expect(assertions["resource-summary:stylesheet:size"]).toEqual([
      "error",
      { maxNumericValue: 30 * 1024 },
    ]);
  });

  it("warns (does not error) on JS and total over budget", () => {
    expect(assertions["resource-summary:script:size"]).toEqual([
      "warn",
      { maxNumericValue: 100 * 1024 },
    ]);
    expect(assertions["resource-summary:total:size"]).toEqual([
      "warn",
      { maxNumericValue: 500 * 1024 },
    ]);
  });
});
