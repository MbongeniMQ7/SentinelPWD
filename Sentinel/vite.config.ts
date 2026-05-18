import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const hiveApiUrl = env.VITE_HIVE_API_URL ?? "http://192.168.137.59/api";
  // Extract base URL (everything before the path) for the proxy target
  const hiveTarget = new URL(hiveApiUrl).origin;

  return {
    plugins: [
      TanStackRouterVite(),
      tailwindcss(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      viteReact(),
    ],
    server: {
      headers: {
        // COOP prevents cross-origin popups from accessing the window —
        // needed for some WASM/SharedArrayBuffer environments.
        // Intentionally NOT setting COEP (require-corp) here because the
        // MediaPipe model is fetched from Google Cloud Storage and that
        // endpoint does not emit Cross-Origin-Resource-Policy, which would
        // cause the fetch to be blocked under require-corp.
        "Cross-Origin-Opener-Policy": "same-origin",
      },
      proxy: {
        "/hive-api": {
          target: hiveTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/hive-api/, "/api"),
        },
      },
    },
    // Tell Vite to treat .wasm files as static assets so it serves them
    // with the correct application/wasm MIME type.
    assetsInclude: ["**/*.wasm"],
    resolve: {
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-router",
        "@tanstack/react-query",
      ],
    },
  };
});
