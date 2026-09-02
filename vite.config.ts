// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv, type Plugin } from "vite";
import path from "path";

// Server routes (e.g. /lovable/email/*) need non-VITE_ env vars such as
// LOVABLE_API_KEY. The wrapper only loads VITE_* for the client define block,
// so load the full env into process.env for server-side code only. These
// values are never added to the client define block.
function serverEnvPlugin(): Plugin {
  return {
    name: "ash-server-env",
    configResolved(config) {
      Object.assign(process.env, loadEnv(config.mode, process.cwd(), ""));
    },
  };
}

export default defineConfig({
  plugins: [serverEnvPlugin()],
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      alias: {
        // Force every entities import to the hoisted v4.5.0 copy — nested v7
        // copies removed ./lib/decode.js and break SSR.
        "entities/lib/decode.js": path.resolve(__dirname, "node_modules/entities/lib/decode.js"),
        "entities/lib/encode.js": path.resolve(__dirname, "node_modules/entities/lib/encode.js"),
        entities: path.resolve(__dirname, "node_modules/entities"),
      },
    },
  },
});
