import type { Reporter, Vitest, TaskResultPack } from "vitest";
import type { ReporterOptions } from "./types.js";
export declare class PerTestCoverageReporter implements Reporter {
    private readonly outFile;
    private readonly accumulator;
    private projectRoot;
    private idMap;
    constructor(options: ReporterOptions);
    onInit(ctx: Vitest): void;
    /**
     * vitest v4 hook: called after each test case finishes.
     * The TestCase carries task.meta() which includes perTestCoverage set by the worker hook.
     */
    onTestCaseResult(testCase: unknown): void;
    /**
     * vitest v4 hook: called when the test run ends.
     * Skips writing output when there are unhandled errors, because the
     * accumulated coverage data may be incomplete.
     */
    onTestRunEnd(_testModules: unknown, unhandledErrors?: unknown[]): void;
    /**
     * vitest v2/v3 hook: called on each batch of task updates.
     */
    onTaskUpdate(packs: TaskResultPack[]): void;
    /**
     * vitest v2/v3 hook: called when the test run finishes.
     * Skips writing output when there are unhandled errors, because the
     * accumulated coverage data may be incomplete.
     */
    onFinished(_files?: unknown, errors?: unknown[]): void;
    private accumulateCoverage;
    private writeOutput;
    private toRelative;
}
