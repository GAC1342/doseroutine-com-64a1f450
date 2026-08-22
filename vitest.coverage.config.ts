import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Coverage gate for the two areas we regressed on most often: portion/unit
 * parsing and the robots.txt policy generator.
 *
 * Run with: bun run test:coverage:gate
 * The run fails when line/statement/branch/function coverage of the files in
 * `include` drops below the thresholds below.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
    include: [
      "src/lib/__tests__/portion-*.test.ts",
      "src/lib/__tests__/robots-ai-agents.test.ts",
      "src/lib/__tests__/robots-health.test.ts",
      "src/lib/__tests__/robots-lang-guard.test.ts",
      "src/lib/__tests__/robots-articles-sitemap.test.ts",
      "src/routes/__tests__/robots-txt.test.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary", "lcov"],
      reportsDirectory: "coverage/units-robots",
      all: true,
      include: [
        "src/lib/portion-units.ts",
        "src/lib/robots-policy.ts",
        "src/lib/robots-policy.config.ts",
        "src/lib/robots-health.ts",
        "src/lib/robots-baseline.ts",
      ],
      thresholds: {
        lines: 85,
        statements: 85,
        functions: 85,
        branches: 80,
      },
    },
  },
});
