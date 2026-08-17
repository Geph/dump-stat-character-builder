import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
  resolve: {
    // Prefer TypeScript sources over sibling .mjs copies used by Node scripts.
    extensions: [".ts", ".tsx", ".mts", ".js", ".jsx", ".mjs", ".json"],
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
})
