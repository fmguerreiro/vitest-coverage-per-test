/**
 * Installs global beforeEach/afterEach hooks that snapshot V8 coverage
 * between tests and stash the per-test delta in task.meta.perTestCoverage.
 *
 * Add this to your vitest setupFiles:
 *
 * ```ts
 * import { installPerTestCoverageHooks } from "vitest-coverage-per-test";
 * installPerTestCoverageHooks();
 * ```
 *
 * Requires coverage.provider: "v8" in your vitest config.
 * Safe for concurrent tests (it.concurrent): the baseline is stored on each
 * test's own context.task.meta rather than in shared module state.
 */
export declare function installPerTestCoverageHooks(): void;
