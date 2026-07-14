// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Same source as import.meta.env.VITE_ADMIN_API_SECRET; inlined as a literal at
// build time so admin API calls (src/utils/adminApi.js) work even in chunks
// where Vite's automatic import.meta.env.VITE_* replacement doesn't reach.
const viteAdminApiSecret = String(process.env.VITE_ADMIN_API_SECRET || "").trim();

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    define: {
      __TBDSM_VITE_ADMIN_API_SECRET__: JSON.stringify(viteAdminApiSecret),
    },
  },
});
