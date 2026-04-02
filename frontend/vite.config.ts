import { codecovVitePlugin } from "@codecov/vite-plugin";
import { defineConfig, mergeConfig } from "vite";

import viteConfig from "./vite-prod.config";

export default defineConfig((configEnv) =>
  mergeConfig(
    viteConfig(configEnv),
    defineConfig({
      plugins: [
        codecovVitePlugin({
          enableBundleAnalysis: process.env.CODECOV_TOKEN !== undefined,
          bundleName: "abacus-frontend",
          uploadToken: process.env.CODECOV_TOKEN,
        }),
      ],
      server: {
        port: 3000,
        proxy: {
          "/api": {
            target: process.env.API_HOST ?? "http://localhost:8080",
            changeOrigin: true,
          },
        },
      },
    }),
  ),
);
