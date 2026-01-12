import eslint from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import { createNodeResolver, importX } from "eslint-plugin-import-x";
import playwright from "eslint-plugin-playwright";
import reactHooks from "eslint-plugin-react-hooks";
import storybook from "eslint-plugin-storybook";
import { readdirSync } from "fs";
import tseslint from "typescript-eslint";

const FEATURES_DIR = "./src/features";

const restrictFeatureImports = readdirSync(FEATURES_DIR, { withFileTypes: true })
  .filter((file) => file.isDirectory())
  .map((dir) => dir.name)
  .map((feature) => ({
    target: `${FEATURES_DIR}/${feature}`,
    from: `${FEATURES_DIR}/`,
    except: [feature],
    message: "Cross-feature imports are not allowed.",
  }));

export default defineConfig(
  {
    // global ignores
    ignores: [
      "dist/**",
      "coverage/**",
      "dist-storybook/**",
      "playwright-report/**",
      "eslint.config.js",
      "mockServiceWorker.js",
    ],
  },
  {
    files: ["**/*.ts{,x}"],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.strictTypeChecked,
      importX.flatConfigs.recommended,
      importX.flatConfigs.typescript,
    ],
    rules: {
      "import-x/namespace": "off",
      "@typescript-eslint/no-unsafe-type-assertion": "error",
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        {
          allowNumber: true,
          allowBoolean: true,
        },
      ],
      "import-x/no-restricted-paths": [
        "error",
        {
          zones: [
            // disables cross-feature imports:
            // e.g. src/features/abc should not import from src/features/xyz, etc.
            ...restrictFeatureImports,

            // enforce unidirectional codebase:
            // e.g. src/app can import from src/features but not the other way around
            {
              target: "./src/features",
              from: "./src/app",
              message: "Imports from app are not allowed in features.",
            },

            // e.g. src/features and src/app can import from these shared modules but not the other way around
            {
              target: ["./src/components", "./src/hooks", "./src/lib", "./src/types", "./src/utils"],
              from: ["./src/features", "./src/app"],
              message: "Imports from features and app are not allowed in shared folders.",
            },
          ],
        },
      ],
    },
    settings: {
      "import-x/resolver-next": [createTypeScriptImportResolver(), createNodeResolver()],
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      parserOptions: {
        projectService: true,
      },
    },
  },
  // Enforce Rules of React for frontend code
  {
    files: ["src/**/*.ts{,x}"],
    extends: [reactHooks.configs.flat["recommended-latest"]],
  },
  // Enable Playwright rules for e2e tests
  {
    files: ["e2e-tests/**/*"],
    extends: [playwright.configs["flat/recommended"]],
  },
  // Enable Storybook rules for stories
  {
    files: ["**/*.stories.tsx"],
    extends: [storybook.configs["flat/recommended"]],
  },
  // Be more lenient for non-production code (test code, e2e test code, Storybook configuration and stories)
  {
    files: [
      "**/*.stories.tsx",
      "**/*.test.ts{,x}",
      ".storybook/**/*.ts{,x}",
      "e2e-tests/**/*",
      "src/testing/**/*.ts{,x}",
    ],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unsafe-type-assertion": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
    },
  },
);
