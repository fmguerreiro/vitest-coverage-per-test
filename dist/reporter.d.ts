import type { Reporter, Vitest, TaskResultPack } from "vitest";
import type { ReporterOptions } from "./types.js";
export declare class PerTestCoverageReporter implements Reporter {
    private readonly outFile;
    private readonly accumulator;
    private projectRoot;
    private idMap;
    constructor(options: ReporterOptions);
    onInit(ctx: Vitest): void;
    onTaskUpdate(packs: TaskResultPack[]): void;
    onFinished(): void;
    private toRelative;
}
