const restrictFeatureImports = require("fs")
  .readdirSync("./src/features", { withFileTypes: true })
  .filter((file) => file.isDirectory())
  .map((dir) => dir.name)
  .map((feature) => ({
    target: `./src/features/${feature}`,
    from: "./src/features",
    except: [feature],
    message: "Cross-feature imports are not allowed.",
  }));

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
        "@typescript-eslint/no-unsafe-type-assertion": "off",
      },
    },
    {
      files: ["*.test.ts{,x}", "src/testing/**/*.ts{,x}"],
      rules: {
        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/no-unsafe-type-assertion": "off",
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
