import eslint from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import { importX } from "eslint-plugin-import-x";
import playwright from "eslint-plugin-playwright";
import reactHooks from "eslint-plugin-react-hooks";
import storybook from "eslint-plugin-storybook";
import { readdirSync } from "fs";
import globals from "globals";
import tseslint from "typescript-eslint";

const restrictFeatureImports = readdirSync("./src/features", { withFileTypes: true })
  .filter((file) => file.isDirectory())
  .map((dir) => dir.name)
  .map((feature) => ({
    target: `./src/features/${feature}`,
    from: "./src/features",
    except: [feature],
    message: "Cross-feature imports are not allowed.",
  }));

export default tseslint.config(
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
    files: ["**/*.ts", "**/*.tsx"],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.strictTypeChecked,
      importX.flatConfigs.recommended,
      importX.flatConfigs.typescript,
      reactHooks.configs["recommended-latest"],
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
              message: "Imports from shared folders are not allowed in features and app.",
            },
          ],
        },
      ],
    },
    settings: {
      "import-x/resolver": {
        typescript: true,
        node: true,
      },
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2020,
      parserOptions: {
        project: "**/tsconfig.json",
      },
    },
  },
  {
    files: ["**/*.js"],
    extends: [eslint.configs.recommended, importX.flatConfigs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ["**/*.test.ts{,x}", "src/testing/**/*.ts{,x}"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unsafe-type-assertion": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
    },
  },
  {
    files: ["**/*.e2e.ts", "e2e-tests/**/*"],
    extends: [playwright.configs["flat/recommended"]],
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "react-hooks/rules-of-hooks": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unsafe-type-assertion": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
    },
  },
  {
    files: ["**/*.stories.tsx"],
    extends: [storybook.configs["flat/recommended"]],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unsafe-type-assertion": "off",
    },
  },
  {
    files: [".storybook/**/*.ts{,x}"],
    rules: {
      "@typescript-eslint/no-unsafe-type-assertion": "off",
    },
  },
);
