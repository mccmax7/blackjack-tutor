import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    environmentMatchGlobs: [["**/storage.test.ts", "jsdom"]],
    include: ["lib/**/*.test.ts"],
  },
});
