import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tsConfig from "./tsconfig.json";
import pkgjson from "./package.json";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    sourcemap: true
    // minify: false, // uncomment for debugging
  },
  define: {
    "process.env.MSW": true,
    "process.env.VERSION": JSON.stringify(pkgjson.version)
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
      }
    )
  },
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true
      }
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: ["app/test/unit/setup.ts"],
    includeSource: ["app/**/*.ts", "lib/**/*.ts"]
  }
}));

const mapObj = <V0, V>(obj: Record<string, V0>, kf: (t: string) => string, vf: (t: V0) => V): Record<string, V> =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [kf(k), vf(v)]));
