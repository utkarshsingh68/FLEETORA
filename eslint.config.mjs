import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Framework and package-manager output:
    "**/node_modules/**",
    ".next/**",
    ".vinext/**",
    "out/**",
    "build/**",
    "**/dist/**",
    ".wrangler/**",
    ".pnpm-store*/**",
    ".runtime/**",

    // Local task and generated artifact caches:
    ".agents/**",
    ".codex/**",
    "outputs/**",
    "work/**",
    "coverage/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
