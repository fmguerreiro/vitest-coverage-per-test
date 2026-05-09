import { PerTestCoverageReporter } from "./reporter.js";
export { PerTestCoverageReporter };
export { installPerTestCoverageHooks } from "./worker-hooks.js";
/**
 * Factory function that returns a configured PerTestCoverageReporter instance.
 *
 * Use this in vitest.config.ts:
 * ```ts
 * reporters: ["default", perTestCoverageReporter({ outFile: ".coverage-per-test.json" })]
 * ```
 */
export function perTestCoverageReporter(options) {
    return new PerTestCoverageReporter(options);
}
//# sourceMappingURL=index.js.map