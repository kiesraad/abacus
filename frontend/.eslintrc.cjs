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
  settings: {
    "import/resolver": {
      typescript: true,
      node: true,
    },
  },
  ignorePatterns: ["dist", ".eslintrc.cjs", "!.ladle/"],
  parser: "@typescript-eslint/parser",
  plugins: ["react-refresh", "jsx-a11y", "prettier", "@typescript-eslint"],
  rules: {
    "jsx-a11y/no-autofocus": "off",
    "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    "@typescript-eslint/restrict-template-expressions": [
      "error",
      {
        allowNumber: true,
        allowBoolean: true,
      },
    ],
    "no-console": process.env.ESLINT_ENV === "production" ? ["error", { allow: ["warn", "error"] }] : "off",
  },
  parserOptions: {
    project: "**/tsconfig.json",
  },
  overrides: [
    {
      files: ["*.e2e.ts", "*PgObj.ts", "e2e-tests/**/fixtures.ts"],
      extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended-type-checked",
        "plugin:import/recommended",
        "plugin:import/typescript",
        "plugin:playwright/recommended",
        "prettier",
      ],
      plugins: ["@typescript-eslint", "prettier"],
      rules: {
        "@typescript-eslint/no-floating-promises": "error",
        "react-hooks/rules-of-hooks": "off",
      },
    },
  ],
};
