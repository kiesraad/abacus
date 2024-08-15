import react from "@vitejs/plugin-react-swc";
import path from "path";
import { defineConfig } from "vite";

import pkgjson from "./package.json";
import tsConfig from "./tsconfig.json";

const apiMode = process.env.API_MODE ?? "mock";
const apiHost = process.env.API_HOST ?? (apiMode === "mock" ? "" : "http://localhost:8080");
const viteHost = process.env.VITE_HOST ?? undefined;

// https://vitejs.dev/config/
export default defineConfig(() => ({
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
  define: {
    "process.env.MSW": apiMode === "mock",
    "process.env.VERSION": JSON.stringify(pkgjson.version),
    "process.env.API_HOST": JSON.stringify(apiHost),
  },
  optimizeDeps: { exclude: ["msw"] },
  plugins: [react()],
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
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
      },
    },
  },
  server: {
    port: 3000,
    host: viteHost,
    proxy: {
      "/api": {
        target: apiHost,
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["app/test/unit/setup.ts"],
    includeSource: ["app/**/*.ts", "lib/**/*.ts"],
  },
}));

const mapObj = <V0, V>(
  obj: Record<string, V0>,
  kf: (t: string) => string,
  vf: (t: V0) => V,
): Record<string, V> => Object.fromEntries(Object.entries(obj).map(([k, v]) => [kf(k), vf(v)]));
