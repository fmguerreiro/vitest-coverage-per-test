import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
function isTestCaseLike(value) {
    if (!value || typeof value !== "object")
        return false;
    const v = value;
    if (v["type"] !== "test" || typeof v["meta"] !== "function")
        return false;
    const mod = v["module"];
    return (typeof mod === "object" &&
        mod !== null &&
        typeof mod["relativeModuleId"] === "string");
}
export class PerTestCoverageReporter {
    outFile;
    accumulator = new Map();
    projectRoot = process.cwd();
    idMap = new Map();
    constructor(options) {
        if (!options.outFile) {
            throw new Error("vitest-coverage-per-test: outFile option is required but was not provided");
        }
        this.outFile = options.outFile;
    }
    onInit(ctx) {
        this.projectRoot = ctx.config.root;
        this.idMap = ctx.state.idMap;
    }
    /**
     * vitest v4 hook: called after each test case finishes.
     * The TestCase carries task.meta() which includes perTestCoverage set by the worker hook.
     */
    onTestCaseResult(testCase) {
        if (!isTestCaseLike(testCase))
            return;
        const meta = testCase.meta();
        const sourcePaths = meta.perTestCoverage;
        if (!Array.isArray(sourcePaths) || sourcePaths.length === 0)
            return;
        const relativeSpecFile = testCase.module.relativeModuleId.replace(/\\/g, "/");
        this.accumulateCoverage(relativeSpecFile, sourcePaths);
    }
    /**
     * vitest v4 hook: called when the test run ends.
     * Skips writing output when there are unhandled errors, because the
     * accumulated coverage data may be incomplete.
     */
    onTestRunEnd(_testModules, unhandledErrors) {
        if (unhandledErrors && unhandledErrors.length > 0)
            return;
        this.writeOutput();
    }
    /**
     * vitest v2/v3 hook: called on each batch of task updates.
     */
    onTaskUpdate(packs) {
        for (const [taskId, , meta] of packs) {
            if (!meta || !Array.isArray(meta.perTestCoverage)) {
                continue;
            }
            const sourcePaths = meta.perTestCoverage;
            if (sourcePaths.length === 0) {
                continue;
            }
            const task = this.idMap.get(taskId);
            if (!task) {
                continue;
            }
            if (task.type !== "test" && task.type !== "custom") {
                continue;
            }
            const relativeSpecFile = this.toRelative(task.file.filepath);
            this.accumulateCoverage(relativeSpecFile, sourcePaths);
        }
    }
    /**
     * vitest v2/v3 hook: called when the test run finishes.
     * Skips writing output when there are unhandled errors, because the
     * accumulated coverage data may be incomplete.
     */
    onFinished(_files, errors) {
        if (errors && errors.length > 0)
            return;
        this.writeOutput();
    }
    accumulateCoverage(relativeSpecFile, sourcePaths) {
        let covered = this.accumulator.get(relativeSpecFile);
        if (!covered) {
            covered = new Set();
            this.accumulator.set(relativeSpecFile, covered);
        }
        for (const sourcePath of sourcePaths) {
            covered.add(sourcePath);
        }
    }
    writeOutput() {
        const tests = {};
        for (const [specFile, sources] of this.accumulator) {
            tests[specFile] = Array.from(sources).sort();
        }
        const output = { version: 1, tests };
        const absoluteOutFile = resolve(this.projectRoot, this.outFile);
        writeFileSync(absoluteOutFile, JSON.stringify(output, null, 2) + "\n", "utf-8");
    }
    toRelative(absolutePath) {
        const prefix = this.projectRoot + "/";
        const relative = absolutePath.startsWith(prefix)
            ? absolutePath.slice(prefix.length)
            : absolutePath;
        return relative.replace(/\\/g, "/");
    }
}
//# sourceMappingURL=reporter.js.map