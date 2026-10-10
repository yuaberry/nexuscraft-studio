import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    include: [
      "src/**/*.test.{ts,tsx}",
      "packages/core/src/**/*.test.ts",
    ],
    environment: "node",
  },
});
