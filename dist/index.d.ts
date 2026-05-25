import { PerTestCoverageReporter } from "./reporter.js";
import type { ReporterOptions } from "./types.js";
export { PerTestCoverageReporter };
export { installPerTestCoverageHooks } from "./worker-hooks.js";
export type { PerTestCoverageOutput, ReporterOptions, PerTestMeta } from "./types.js";
/**
 * Factory function that returns a configured PerTestCoverageReporter instance.
 *
 * Use this in vitest.config.ts:
 * ```ts
 * reporters: ["default", perTestCoverageReporter({ outFile: ".coverage-per-test.json" })]
 * ```
 */
export declare function perTestCoverageReporter(options: ReporterOptions): PerTestCoverageReporter;
