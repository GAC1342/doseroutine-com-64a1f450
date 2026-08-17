import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test-setup.ts"],
    // Route-module tests dynamically import heavy TSX route files; the first
    // transform can exceed the 5s default on a cold cache.
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
