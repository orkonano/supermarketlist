import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import sonarjs from "eslint-plugin-sonarjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Claude Code agent worktrees — not project source
    ".claude/**",
  ]),
  // Clean Code rules for all source files
  {
    plugins: { sonarjs },
    rules: {
      // Long functions = too many responsibilities (Uncle Bob; 50 is a practical gate)
      "max-lines-per-function": ["warn", { max: 50, skipBlankLines: true, skipComments: true }],
      // High cyclomatic complexity = hard to test and understand
      complexity: ["warn", 10],
      // Too many parameters = function does too many things
      "max-params": ["warn", 4],
      // Hard-to-read deeply nested logic
      "sonarjs/cognitive-complexity": ["warn", 15],
      // Duplicate string literals — extract to named constants
      "sonarjs/no-duplicate-string": ["warn", { threshold: 3 }],
      // Copy-pasted functions — extract to shared helper
      "sonarjs/no-identical-functions": "warn",
    },
  },
  // Relax rules for test files — fixture strings and long describe blocks are expected
  {
    files: ["lib/__tests__/**", "**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts"],
    rules: {
      "max-lines-per-function": "off",
      "sonarjs/no-duplicate-string": "off",
      complexity: "off",
      "sonarjs/cognitive-complexity": "off",
    },
  },
]);

export default eslintConfig;
