import pluginJs from "@eslint/js";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import pluginReact from "eslint-plugin-react";
import reactPlugin from "eslint-plugin-react";
import react from "eslint-plugin-react";
import reactRecommended from "eslint-plugin-react/configs/recommended.js";
import globals from "globals";
import tseslint from "typescript-eslint";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  {
    files: ["**/*.{ts,tsx}"], // not js
    ignores: ["**/dist", "**/.eslintrc.cjs", "!**/.ladle/"],
    // ...reactRecommended,
    plugins: {
      "@typescript-eslint": typescriptEslint,
      react,
    },
    languageOptions: { globals: globals.browser },
    ...reactPlugin.configs.flat.recommended,
    ...reactPlugin.configs.flat["jsx-runtime"],
  },
  pluginJs.configs.recommended, // should this bere here?
  ...tseslint.configs.recommended, // should this bere here?
];
