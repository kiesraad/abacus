import { defineConfig, rspack } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";

export default defineConfig({
  plugins: [pluginReact()],
  html: {
    template: "./index.html",
  },
  source: {
    define: {
      __API_MSW__: JSON.stringify(process.env.__API_MSW__),
      __APP_VERSION__: JSON.stringify(process.env.__APP_VERSION__),
      __GIT_DIRTY__: JSON.stringify(process.env.__GIT_DIRTY__),
      __GIT_BRANCH__: JSON.stringify(process.env.__GIT_BRANCH__),
      __GIT_COMMIT__: JSON.stringify(process.env.__GIT_COMMIT__),
    },
    entry: {
      index: "./src/app/main.tsx",
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:8080",
    },
  },
});
