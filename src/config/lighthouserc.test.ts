import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const lighthouserc = require(
  path.resolve(__dirname, "../../lighthouserc.js"),
) as {
  ci: {
    collect: { numberOfRuns: number };
    assert: {
      assertions: Record<
        string,
        [
          string,
          {
            minScore?: number;
            maxNumericValue?: number;
            aggregationMethod?: string;
          },
        ]
      >;
    };
  };
};

describe("lighthouserc budgets (spec 5.8.4 / issue #6)", () => {
  const { assertions } = lighthouserc.ci.assert;

  it("uses median of 3 runs for CI stability (#9)", () => {
    expect(lighthouserc.ci.collect.numberOfRuns).toBe(3);
  });

  it("blocks on HTML/CSS over budget and categories that meet 100", () => {
    expect(assertions["categories:performance"]).toEqual([
      "error",
      { minScore: 1, aggregationMethod: "median" },
    ]);
    expect(assertions["categories:accessibility"]).toEqual([
      "error",
      { minScore: 1, aggregationMethod: "median" },
    ]);
    expect(assertions["categories:seo"]).toEqual([
      "error",
      { minScore: 1, aggregationMethod: "median" },
    ]);
    expect(assertions["resource-summary:document:size"]).toEqual([
      "error",
      { maxNumericValue: 50 * 1024, aggregationMethod: "median" },
    ]);
    expect(assertions["resource-summary:stylesheet:size"]).toEqual([
      "error",
      { maxNumericValue: 30 * 1024, aggregationMethod: "median" },
    ]);
  });

  it("warns on best-practices (measured below 100) and JS/total over budget", () => {
    expect(assertions["categories:best-practices"]).toEqual([
      "warn",
      { minScore: 1, aggregationMethod: "median" },
    ]);
    expect(assertions["resource-summary:script:size"]).toEqual([
      "warn",
      { maxNumericValue: 100 * 1024, aggregationMethod: "median" },
    ]);
    expect(assertions["resource-summary:total:size"]).toEqual([
      "warn",
      { maxNumericValue: 500 * 1024, aggregationMethod: "median" },
    ]);
  });
});
