import browserslist from "browserslist";
import { browserslistToTargets } from "lightningcss";
import { execSync } from "node:child_process";
import path from "path";
import { defineConfig, UserConfig } from "vite";

import pkgjson from "./package.json";
import tsConfig from "./tsconfig.json";

const mapObj = <V0, V>(obj: Record<string, V0>, kf: (t: string) => string, vf: (t: V0) => V): Record<string, V> =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [kf(k), vf(v)]));

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
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
      // cssMinify: 'lightningcss',
      rollupOptions: {
        input: {
          app: "index.html",
        },
      },
    },
    css: {
      transformer: "lightningcss",
      lightningcss: {
        targets: browserslistToTargets(browserslist(">= 0.25%")),
      },
    },
    define: {
      __API_MSW__: JSON.stringify(mswEnabled),
      __APP_VERSION__: JSON.stringify(pkgjson.version),
      ...gitDetails,
    },
    optimizeDeps: { exclude: ["msw"] },
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
  } satisfies UserConfig;
});
