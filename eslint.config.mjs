import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  eslintConfigPrettier,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "infra/cdk/dist/**",
    "infra/cdk/cdk.out/**",
    "next-env.d.ts",
    // #42: tsc transpile 生成物（未使用シンボル・catch (_a) は正本側で管理）
    "public/sw.js",
  ]),
]);

export default eslintConfig;
