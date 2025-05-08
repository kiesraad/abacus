// @ts-check
import eslint from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import tseslint from "typescript-eslint";

// https://typescript-eslint.io/getting-started/#step-2-configuration
// https://typescript-eslint.io/packages/typescript-eslint#config
export default tseslint.config(
  {
    files: ["**/*.ts", "**/*.tsx"],
    ignores: ["dist", ".eslintrc.cjs", "!.ladle/"],
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
