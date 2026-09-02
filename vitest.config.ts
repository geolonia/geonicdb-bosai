import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      // csp-policy は aws-cdk 非依存。Stack synth テストは infra/cdk 側で実行（CI で npm ci --prefix）
      "infra/cdk/lib/csp-policy.test.ts",
    ],
    exclude: ["infra/cdk/lib/bosai-site-stack.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
