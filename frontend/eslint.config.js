// @ts-check
import eslint from "@eslint/js";
import importPlugin from "eslint-plugin-import";
// https://typescript-eslint.io/getting-started/#step-2-configuration
// https://typescript-eslint.io/packages/typescript-eslint#config
import jsxA11y from "eslint-plugin-jsx-a11y";
// import globals from "globals";
import playwright from "eslint-plugin-playwright";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { readdirSync } from "fs";
import tseslint from "typescript-eslint";

// TODO: parser: "@typescript-eslint/parser",
// TODO. *.js files
// TODO more extends for ladle e2e tests

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
    ignores: ["dist/**", ".eslintrc.cjs"],
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
      eslintPluginPrettierRecommended,
      reactHooks.configs["recommended-latest"],
    ],
    rules: {
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
      ecmaVersion: 2020, // instead of env: { es2020: true }
      // globals: {
      // 	...globals.browser
      // }, // error because of  Global "AudioWorkletGlobalScope " has leading or trailing whitespace.
      parserOptions: {
        project: "**/tsconfig.json",
      },
    },
  },
  {
    files: ["**/*.test.ts{,x}", "src/testing/**/*.ts{,x}"],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.strictTypeChecked,
      importPlugin.flatConfigs.recommended,
      importPlugin.flatConfigs.typescript,
      eslintPluginPrettierRecommended,
    ],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unsafe-type-assertion": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
    },
  },
  {
    files: ["*.e2e.ts", "e2e-tests/**/*"],
    extends: [
      playwright.configs["flat/recommended"],
      eslint.configs.recommended,
      tseslint.configs.strictTypeChecked,
      importPlugin.flatConfigs.recommended,
      importPlugin.flatConfigs.typescript,
      eslintPluginPrettierRecommended,
    ],
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
      "react-hooks/rules-of-hooks": "off",
    },
  },
);
