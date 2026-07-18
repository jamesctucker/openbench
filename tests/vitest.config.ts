import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.test.mjs", "tests/**/*.spec.ts"],
    exclude: ["node_modules/**", ".opencode/**"],
    watch: false,
  },
});
