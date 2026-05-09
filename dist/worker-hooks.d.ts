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
 * Not safe for concurrent tests (it.concurrent) within a single spec file.
 */
export declare function installPerTestCoverageHooks(): void;
