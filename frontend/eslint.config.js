// @ts-check
import eslint from "@eslint/js";
import importPlugin from "eslint-plugin-import";
// import globals from "globals";
import tseslint from "typescript-eslint";

// https://typescript-eslint.io/getting-started/#step-2-configuration
// https://typescript-eslint.io/packages/typescript-eslint#config

export default tseslint.config(
  {
    // global ignores
    ignores: ["dist/**", ".eslintrc.cjs"],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    ignores: ["!.ladle/**"],
    extends: [eslint.configs.recommended, tseslint.configs.recommended, importPlugin.flatConfigs.recommended],
    rules: {
      "@typescript-eslint/no-unsafe-type-assertion": "error",
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
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unsafe-type-assertion": "off",
    },
  },
);
