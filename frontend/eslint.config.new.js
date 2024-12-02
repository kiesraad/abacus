import pluginJs from "@eslint/js";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import importPlugin from "eslint-plugin-import";
import pluginReact from "eslint-plugin-react";
import reactPlugin from "eslint-plugin-react";
import react from "eslint-plugin-react";
import hooksPlugin from "eslint-plugin-react-hooks";
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
    ignores: ["**/dist", "**/.eslintrc.cjs", "!**/.ladle/"],
  },
  {
    files: ["**/*.{ts,tsx}"], // not js
    // ...reactRecommended,  // uncomment or remove?
    plugins: {
      "@typescript-eslint": typescriptEslint,
      react,
    },
    languageOptions: { globals: globals.browser },
    ...reactPlugin.configs.flat.recommended,
    ...reactPlugin.configs.flat["jsx-runtime"],
    ...importPlugin.flatConfigs.recommended,
    ...importPlugin.flatConfigs.typescript,
  },
  {
    plugins: {
      "react-hooks": hooksPlugin,
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      ...hooksPlugin.configs.recommended.rules,
    },
  },
  pluginJs.configs.recommended, // should this bere here?
  ...tseslint.configs.recommended, // should this bere here? or tseslint.configs.recommended in root?
];
