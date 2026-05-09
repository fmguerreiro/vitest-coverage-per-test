import { defineConfig } from "vitest/config";
import { perTestCoverageReporter } from "../../../src/index.js";

export default defineConfig({
  test: {
    include: ["tests/**/*.spec.ts"],
    setupFiles: ["./setup.ts"],
    coverage: {
      enabled: true,
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["tests/**"],
    },
    reporters: [
      "default",
      perTestCoverageReporter({ outFile: ".coverage-per-test.json" }),
    ],
  },
});
