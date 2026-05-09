import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
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
            let covered = this.accumulator.get(relativeSpecFile);
            if (!covered) {
                covered = new Set();
                this.accumulator.set(relativeSpecFile, covered);
            }
            for (const sourcePath of sourcePaths) {
                covered.add(sourcePath);
            }
        }
    }
    onFinished() {
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