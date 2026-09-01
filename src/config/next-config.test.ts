import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("next.config", () => {
  it("uses static export for CDN-friendly public pages", () => {
    expect(nextConfig.output).toBe("export");
  });

  it("disables image optimization API required by Node runtime", () => {
    expect(nextConfig.images).toEqual({ unoptimized: true });
  });
});
