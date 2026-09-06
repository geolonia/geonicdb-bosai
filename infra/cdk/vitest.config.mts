import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
    // NodejsFunction bundling + multi-stack synth can exceed the 5s default
    // when the suite runs in parallel under load.
    testTimeout: 30_000,
  },
});
