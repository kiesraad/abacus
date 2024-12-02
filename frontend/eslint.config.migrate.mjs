import { fixupConfigRules, fixupPluginRules } from "@eslint/compat";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import jsxA11Y from "eslint-plugin-jsx-a11y";
import prettier from "eslint-plugin-prettier";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  {
    ignores: ["**/dist", "**/.eslintrc.cjs", "!**/.ladle/"],
  },
  ...fixupConfigRules(
    compat.extends(
      "eslint:recommended",
      "plugin:@typescript-eslint/strict-type-checked",
      "plugin:import/recommended",
      "plugin:import/typescript",
      "plugin:jsx-a11y/recommended",
      "plugin:react-hooks/recommended",
      "prettier",
    ),
  ),
  {
    plugins: {
      "react-refresh": reactRefresh,
      "jsx-a11y": fixupPluginRules(jsxA11Y),
      prettier,
      "@typescript-eslint": fixupPluginRules(typescriptEslint),
    },

    languageOptions: {
      globals: {
        ...globals.browser,
      },

      parser: tsParser,
      ecmaVersion: 5,
      sourceType: "script",

      parserOptions: {
        project: "**/tsconfig.json",
      },
    },

    settings: {
      "import/resolver": {
        typescript: true,
        node: true,
      },
    },

    rules: {
      "jsx-a11y/no-autofocus": "off",

      "react-refresh/only-export-components": [
        "warn",
        {
          allowConstantExport: true,
        },
      ],

      "@typescript-eslint/restrict-template-expressions": [
        "error",
        {
          allowNumber: true,
          allowBoolean: true,
        },
      ],

      "no-console": "off",
    },
  },
  ...fixupConfigRules(
    compat.extends(
      "eslint:recommended",
      "plugin:@typescript-eslint/recommended-type-checked",
      "plugin:import/recommended",
      "plugin:import/typescript",
      "plugin:playwright/recommended",
      "prettier",
    ),
  ).map((config) => ({
    ...config,
    files: ["**/*.e2e.ts", "**/*PgObj.ts"],
  })),
  {
    files: ["**/*.e2e.ts", "**/*PgObj.ts"],

    plugins: {
      "@typescript-eslint": fixupPluginRules(typescriptEslint),
      prettier,
    },

    rules: {
      "@typescript-eslint/no-floating-promises": "error",
    },
  },
];
