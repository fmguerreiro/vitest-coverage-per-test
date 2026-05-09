import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Reporter, Vitest, TaskResultPack } from "vitest";
import type { ReporterOptions, PerTestCoverageOutput } from "./types.js";

export class PerTestCoverageReporter implements Reporter {
  private readonly outFile: string;
  private readonly accumulator: Map<string, Set<string>> = new Map();
  private ctx: Vitest | undefined;

  constructor(options: ReporterOptions) {
    if (!options.outFile) {
      throw new Error(
        "vitest-coverage-per-test: outFile option is required but was not provided"
      );
    }
    this.outFile = options.outFile;
  }

  onInit(ctx: Vitest): void {
    this.ctx = ctx;
  }

  onTaskUpdate(packs: TaskResultPack[]): void {
    for (const [taskId, , meta] of packs) {
      if (!meta || !Array.isArray(meta.perTestCoverage)) {
        continue;
      }
      const sourcePaths: string[] = meta.perTestCoverage;
      if (sourcePaths.length === 0) {
        continue;
      }

      const task = this.ctx?.state.idMap.get(taskId);
      if (!task) {
        continue;
      }
      if (task.type !== "test" && task.type !== "custom") {
        continue;
      }

      const specFilePath = task.file.filepath;
      const relativeSpecFile = this.toRelative(specFilePath);

      let covered = this.accumulator.get(relativeSpecFile);
      if (!covered) {
        covered = new Set<string>();
        this.accumulator.set(relativeSpecFile, covered);
      }
      for (const sourcePath of sourcePaths) {
        covered.add(sourcePath);
      }
    }
  }

  onFinished(): void {
    const tests: Record<string, string[]> = {};
    for (const [specFile, sources] of this.accumulator) {
      tests[specFile] = Array.from(sources).sort();
    }
    const output: PerTestCoverageOutput = { version: 1, tests };
    const projectRoot = this.ctx?.config.root ?? process.cwd();
    const absoluteOutFile = resolve(projectRoot, this.outFile);
    writeFileSync(absoluteOutFile, JSON.stringify(output, null, 2) + "\n", "utf-8");
  }

  private toRelative(absolutePath: string): string {
    const projectRoot = this.ctx?.config.root ?? process.cwd();
    const prefix = projectRoot + "/";
    const relative = absolutePath.startsWith(prefix)
      ? absolutePath.slice(prefix.length)
      : absolutePath;
    return relative.replace(/\\/g, "/");
  }
}
