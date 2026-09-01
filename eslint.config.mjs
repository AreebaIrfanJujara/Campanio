import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

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
    // Non-Next.js auxiliary files linted by different tools or runtimes:
    "server/**",    // Node.js gateway — CommonJS, not subject to TS ESLint rules
    "services/**",  // Python FastAPI service
    "mobile/**",    // React Native / Expo — different ruleset
    "public/sw.js", // Service worker — browser globals context
  ]),
  {
    rules: {
      // Downgrade no-explicit-any: catch blocks and browser API casts legitimately need it
      "@typescript-eslint/no-explicit-any": "warn",
      // Downgrade immutability rule: useCallback wrapping is a refactor step, not a blocker
      "react-hooks/immutability": "warn",
      // Downgrade set-state-in-effect: GPS callback, Promise.resolve patterns are intentional
      "react-hooks/set-state-in-effect": "warn",
      // Downgrade purity: Math.random in timeout callbacks inside event handlers is intentional
      "react-hooks/purity": "warn",
      // Keep exhaustive-deps as warning, not error
      "react-hooks/exhaustive-deps": "warn",
    },
  },
]);

export default eslintConfig;
