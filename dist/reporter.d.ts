import type { ReporterOptions } from "./types.js";
/**
 * Duck-typed vitest shapes. The named exports and their signatures diverge
 * across vitest v2/v3/v4 (e.g. v4 drops the Vitest/Task/Reporter exports and
 * renames TaskResultPack to RunnerTaskResultPack), so we type only the fields
 * we read and let vitest dispatch to these methods by name at runtime.
 */
interface PerTestMeta {
    perTestCoverage?: string[];
}
interface VitestLike {
    config: {
        root: string;
    };
    state: {
        idMap: Map<string, TaskLike>;
    };
}
interface TaskLike {
    type: string;
    file: {
        filepath: string;
    };
}
type TaskResultPackLike = [id: string, result: unknown, meta: PerTestMeta];
export declare class PerTestCoverageReporter {
    private readonly outFile;
    private readonly accumulator;
    private projectRoot;
    private idMap;
    constructor(options: ReporterOptions);
    onInit(ctx: VitestLike): void;
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
    onTaskUpdate(packs: TaskResultPackLike[]): void;
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
export {};
