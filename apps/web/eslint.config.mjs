import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const rawApiModules = [
  "@/lib/api/client",
  "@/lib/api/deliverables",
  "@/lib/api/learning",
  "@/lib/api/sessions",
  "@/lib/api/tool-requests",
  "@/lib/api/tools",
];

export default defineConfig([
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react/no-unescaped-entities": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@next/next/no-assign-module-variable": "warn",
      "@typescript-eslint/no-require-imports": "warn",
    },
  },
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@tanstack/react-query",
              message:
                "Pages and components must consume feature integration hooks instead of TanStack Query directly.",
            },
            ...rawApiModules.map((name) => ({
              name,
              message:
                "Pages and components must consume the feature integration barrel and hooks, not raw API request modules.",
            })),
          ],
          patterns: [
            {
              group: ["@/lib/api/*/requests", "@/lib/api/*/keys"],
              message:
                "Request functions and query keys are private to the feature integration layer.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["app/providers.tsx"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
