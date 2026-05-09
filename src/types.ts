/**
 * Per-test coverage output format written to outFile by the reporter.
 *
 * version: 1 is the only defined version. Reserved for future schema evolution.
 */
export interface PerTestCoverageOutput {
  version: 1;
  tests: Record<string, string[]>;
}

/**
 * Options accepted by the perTestCoverageReporter() factory function.
 */
export interface ReporterOptions {
  outFile: string;
}

declare module "@vitest/runner" {
  interface TaskMeta {
    /**
     * Project-relative source file paths covered while this test ran.
     * Populated by installPerTestCoverageHooks() in the worker process.
     * Read by PerTestCoverageReporter in the main process.
     */
    perTestCoverage?: string[];
    /**
     * V8 call-count snapshot taken immediately before this test ran.
     * Used by installPerTestCoverageHooks() to compute the per-test delta.
     * Stored per-test so concurrent tests cannot corrupt each other's baselines.
     */
    _perTestBaseline?: Map<string, number>;
  }
}
