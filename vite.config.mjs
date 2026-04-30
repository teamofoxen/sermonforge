import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  base: "./",
  oxc: {
    // Vitest 4 / rolldown SSR doesn't pick up the react plugin's JSX
    // transform on its own — set it explicitly so .tsx contract tests parse.
    // (vite-react-babel previously read this from `esbuild`, but vite 7+
    // prefers `oxc` since rolldown uses oxc internally.)
    jsx: "automatic",
  },
  test: {
    environment: "node",
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "markdown": ["react-markdown"],
        },
      },
    },
  },
});
