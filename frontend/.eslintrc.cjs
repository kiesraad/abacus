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
      files: ["*.e2e.ts", "e2e-tests/**/*"],
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
        "@typescript-eslint/no-non-null-assertion": "off",
      },
    },
    {
      files: ["*.test.tsx", "src/testing/**/*.ts"],
      rules: {
        "@typescript-eslint/no-non-null-assertion": "off",
      },
    },
    {
      files: ["src/components/ui/**/*.e2e.ts"],
      rules: {
        // Needed for Ladle, page.waitForSelector("[data-storyloaded]")
        "playwright/no-wait-for-selector": "off",
      },
    },
  ],
};
