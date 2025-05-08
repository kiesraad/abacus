// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

// https://typescript-eslint.io/getting-started/#step-2-configuration
// https://typescript-eslint.io/packages/typescript-eslint#config
export default tseslint.config({
  files: ["**/*.ts", "**/*.tsx"],
  extends: [eslint.configs.recommended, tseslint.configs.recommended],
});
