import eslint from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";
import jsxA11y from "eslint-plugin-jsx-a11y";
import playwright from "eslint-plugin-playwright";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
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
    ignores: ["dist/**", "eslint.config.js", "mockServiceWorker.js"],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    ignores: ["!.ladle/**"],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.strictTypeChecked,
      importPlugin.flatConfigs.recommended,
      importPlugin.flatConfigs.typescript,
      reactRefresh.configs.recommended,
      jsxA11y.flatConfigs.recommended,
      reactHooks.configs["recommended-latest"],
    ],
    rules: {
      "import/namespace": "off",
      "jsx-a11y/no-autofocus": "off",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unsafe-type-assertion": "error",
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        {
          allowNumber: true,
          allowBoolean: true,
        },
      ],
      "no-console": process.env.ESLINT_ENV === "production" ? ["error", { allow: ["warn", "error"] }] : "off",
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            // disables cross-feature imports:
            // eg. src/features/abc should not import from src/features/xyz, etc.
            ...restrictFeatureImports,

            // enforce unidirectional codebase:
            // e.g. src/app can import from src/features but not the other way around
            {
              target: "./src/features",
              from: "./src/app",
              message: "Imports from app are not allowed in features.",
            },

            // e.g src/features and src/app can import from these shared modules but not the other way around
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
      "import/resolver": {
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
    ignores: ["!.ladle/**"],
    extends: [eslint.configs.recommended, importPlugin.flatConfigs.recommended],
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
    files: ["src/components/ui/**/*.e2e.ts"],
    extends: [playwright.configs["flat/recommended"]],
    rules: {
      // Needed for Ladle, page.waitForSelector("[data-storyloaded]")
      "playwright/no-wait-for-selector": "off",
    },
  },
);
