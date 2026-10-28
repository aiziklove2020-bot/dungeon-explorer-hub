// Builds public/assets/site-data.js (window.LPData for the static public/*.html
// pages) from src/site-bridge.ts. Run: npm run build:bridge
import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  configFile: false,
  publicDir: false,
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  build: {
    outDir: "public/assets",
    emptyOutDir: false,
    minify: true,
    lib: { entry: path.resolve(__dirname, "src/site-bridge.ts"), formats: ["es"], fileName: () => "site-data.js" },
    rolldownOptions: { output: { codeSplitting: false } },
  },
});
