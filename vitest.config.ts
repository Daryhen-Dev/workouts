import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["src/test/setup.ts"],
    // Solo las pruebas colocadas en src/ (convención del repo). El smoke
    // offline de U12 (tests/offline.spec.ts) es de Playwright y corre por
    // `pnpm test:offline` — jsdom no puede alojar service workers.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
