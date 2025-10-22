import browserslist from "browserslist";
import { browserslistToTargets } from "lightningcss";
import { execSync } from "node:child_process";
import path from "path";
import { defineConfig, UserConfig } from "vite";

import pkgjson from "./package.json";

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const mswEnabled = process.env.API_MODE === "mock";
  const includeStorybookLink = process.env.INCLUDE_STORYBOOK_LINK === "true";
  // true by default, can be set to false
  const showDevPage = process.env.SHOW_DEV_PAGE === undefined || process.env.SHOW_DEV_PAGE === "true";

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

  const define = {
    __API_MSW__: JSON.stringify(mswEnabled),
    __APP_VERSION__: JSON.stringify(pkgjson.version),
    __INCLUDE_STORYBOOK_LINK__: JSON.stringify(includeStorybookLink),
    __SHOW_DEV_PAGE__: JSON.stringify(showDevPage),
    ...gitDetails,
  };

  // eslint-disable-next-line no-console
  console.log("Vite build environment:");
  Object.entries(define).forEach(([key, value]) => {
    // eslint-disable-next-line no-console
    console.log(`${key}: ${value}`);
  });

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
      transformer: "lightningcss",
      lightningcss: {
        targets: browserslistToTargets(browserslist(">= 0.25% and not dead")),
      },
    },
    define,
    optimizeDeps: { exclude: ["msw"] },
    resolve: {
      alias: [{ find: "@", replacement: path.resolve(__dirname, "./src") }],
    },
  } satisfies UserConfig;
});
