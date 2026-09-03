import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy, DEFAULT_CSP } from "./csp-policy";

describe("buildContentSecurityPolicy", () => {
  it("emits the fixed 5.8.2 baseline without unsafe-inline/eval or strict-dynamic", () => {
    expect(DEFAULT_CSP).toBe(
      "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests",
    );
    expect(DEFAULT_CSP).not.toMatch(/unsafe-inline/);
    expect(DEFAULT_CSP).not.toMatch(/unsafe-eval/);
    expect(DEFAULT_CSP).not.toMatch(/strict-dynamic/);
  });

  it("merges connect-src / img-src extras for future map hosts (#3)", () => {
    const csp = buildContentSecurityPolicy({
      connectSrc: ["https://api.example.example"],
      imgSrc: ["https://tiles.example.example"],
      workerSrc: ["'self'", "blob:"],
      childSrc: ["blob:"],
    });
    expect(csp).toContain("connect-src 'self' https://api.example.example");
    expect(csp).toContain("img-src 'self' https://tiles.example.example");
    expect(csp).toContain("worker-src 'self' blob:");
    expect(csp).toContain("child-src blob:");
    expect(csp).toMatch(/script-src 'self'(;|$)/);
  });

  it("rejects wildcard and unsafe sources (near-miss boundary)", () => {
    expect(() =>
      buildContentSecurityPolicy({ imgSrc: ["https://*.example.com"] }),
    ).toThrow(/wildcard/);
    expect(() =>
      buildContentSecurityPolicy({ styleSrc: ["'unsafe-inline'"] }),
    ).toThrow(/unsafe/);
    expect(() =>
      buildContentSecurityPolicy({
        connectSrc: ["https://evil.example; script-src"],
      }),
    ).toThrow(/;/);
    expect(() =>
      buildContentSecurityPolicy({
        connectSrc: ["https://api.example https://evil.example"],
      }),
    ).toThrow(/whitespace/);
  });

  it("appends report-uri when provided", () => {
    const csp = buildContentSecurityPolicy({
      reportUri: "https://report.example.example/csp",
    });
    expect(
      csp.endsWith("; report-uri https://report.example.example/csp"),
    ).toBe(true);
  });

  it("rejects report-uri with directive injection characters", () => {
    expect(() =>
      buildContentSecurityPolicy({
        reportUri: "https://r.example/csp; script-src 'unsafe-inline'",
      }),
    ).toThrow(/report-uri/);
  });
});
