module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/strict-type-checked",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "plugin:jsx-a11y/recommended",
    "plugin:react-hooks/recommended",
    "prettier",
  ],
  ignorePatterns: ["dist", ".eslintrc.cjs", "!.ladle/"],
  parser: "@typescript-eslint/parser",
  plugins: ["react-refresh", "jsx-a11y", "prettier", "@typescript-eslint"],
  rules: {
    "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    "@typescript-eslint/restrict-template-expressions": [
      "error",
      {
        allowNumber: true,
        allowBoolean: true,
      },
    ],
  },
  parserOptions: {
    project: "./tsconfig.json",
  },
  overrides: [
    {
      files: "*.e2e.ts",
      extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended-type-checked",
        "plugin:playwright/recommended",
      ],
      plugins: ["@typescript-eslint"],
      rules: {
        "@typescript-eslint/no-floating-promises": "error",
      },
    },
  ],
};
