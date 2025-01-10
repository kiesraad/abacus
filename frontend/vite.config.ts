import { codecovVitePlugin } from "@codecov/vite-plugin";
import react from "@vitejs/plugin-react-swc";
import { execSync } from "node:child_process";
import path from "path";
import { defineConfig, UserConfig } from "vite";
import { coverageConfigDefaults } from "vitest/config";

import pkgjson from "./package.json";
import tsConfig from "./tsconfig.json";

const mapObj = <V0, V>(obj: Record<string, V0>, kf: (t: string) => string, vf: (t: V0) => V): Record<string, V> =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [kf(k), vf(v)]));

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const apiHost = process.env.API_HOST ?? "http://localhost:8080";

  const mswEnabled = process.env.API_MODE === "mock";
  let gitDetails = {
    __GIT_DIRTY__: undefined as string | undefined,
    __GIT_BRANCH__: undefined as string | undefined,
    __GIT_COMMIT__: undefined as string | undefined,
  };
  if (command == "build") {
    let gitDirty: boolean | undefined;
    let gitBranch: string | undefined;
    let gitCommit: string | undefined;
    try {
      gitDirty = execSync("git status --porcelain").toString().trimEnd().length > 0;
      gitBranch = process.env.GITHUB_HEAD_REF ?? execSync("git rev-parse --abbrev-ref HEAD").toString().trimEnd();
      gitCommit = execSync("git rev-parse --short HEAD").toString().trimEnd();
    } catch {
      // ignore errors, most likely building from outside a Git repository
    }
    gitDetails = {
      __GIT_DIRTY__: JSON.stringify(gitDirty),
      __GIT_BRANCH__: JSON.stringify(gitBranch),
      __GIT_COMMIT__: JSON.stringify(gitCommit),
    };
  }

  return {
    build: {
      outDir: path.resolve(__dirname, "dist"),
      emptyOutDir: true,
      sourcemap: true,
      minify: false,
      rollupOptions: {
        input: {
          app: "index.html",
        },
      },
    },
    css: {
      modules: {
        // Only dashes in class names will be converted to camelCase,
        // the original class name will not to be removed from the locals
        localsConvention: "dashes",
      },
    },
    define: {
      __API_MSW__: JSON.stringify(mswEnabled),
      __APP_VERSION__: JSON.stringify(pkgjson.version),
      ...gitDetails,
    },
    optimizeDeps: { exclude: ["msw"] },
    plugins: [
      react(),
      codecovVitePlugin({
        enableBundleAnalysis: process.env.CODECOV_TOKEN !== undefined,
        bundleName: "abacus-frontend",
        uploadToken: process.env.CODECOV_TOKEN,
      }),
    ],
    resolve: {
      alias: mapObj(
        tsConfig.compilerOptions.paths,
        (k) => k.replace("/*", ""),
        (paths) => {
          if (!paths[0]) throw new Error("No path found");
          return path.resolve(__dirname, paths[0].replace("/*", ""));
        },
      ),
    },
    server: {
      port: 3000,
      proxy: {
        "/api": {
          target: apiHost,
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: "jsdom",
      restoreMocks: true,
      setupFiles: ["lib/test/setup.ts"],
      includeSource: ["app/**/*.ts", "lib/**/*.ts"],
      testTimeout: 30_000,
      coverage: {
        exclude: [
          "*.config.ts",
          "*.config.mjs",
          "mockServiceWorker.js",
          "e2e-tests/**",
          ...coverageConfigDefaults.exclude,
        ],
      },
    },
  } satisfies UserConfig;
});
