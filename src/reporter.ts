import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Reporter, Vitest, TaskResultPack, Task } from "vitest";
import type { ReporterOptions, PerTestCoverageOutput } from "./types.js";

/**
 * Duck-typed shape of vitest v4's TestCase, which may not be available as a
 * named export in v2/v3. We access only the fields we need.
 */
interface TestCaseLike {
  type: "test";
  meta(): { perTestCoverage?: string[] };
  module: { relativeModuleId: string };
}

function isTestCaseLike(value: unknown): value is TestCaseLike {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v["type"] !== "test" || typeof v["meta"] !== "function") return false;
  const mod = v["module"];
  return (
    typeof mod === "object" &&
    mod !== null &&
    typeof (mod as Record<string, unknown>)["relativeModuleId"] === "string"
  );
}

export class PerTestCoverageReporter implements Reporter {
  private readonly outFile: string;
  private readonly accumulator: Map<string, Set<string>> = new Map();
  private projectRoot: string = process.cwd();
  private idMap: Map<string, Task> = new Map();

  constructor(options: ReporterOptions) {
    if (!options.outFile) {
      throw new Error(
        "vitest-coverage-per-test: outFile option is required but was not provided"
      );
    }
    this.outFile = options.outFile;
  }

  onInit(ctx: Vitest): void {
    this.projectRoot = ctx.config.root;
    this.idMap = ctx.state.idMap;
  }

  /**
   * vitest v4 hook: called after each test case finishes.
   * The TestCase carries task.meta() which includes perTestCoverage set by the worker hook.
   */
  onTestCaseResult(testCase: unknown): void {
    if (!isTestCaseLike(testCase)) return;

    const meta = testCase.meta();
    const sourcePaths = meta.perTestCoverage;
    if (!Array.isArray(sourcePaths) || sourcePaths.length === 0) return;

    const relativeSpecFile = testCase.module.relativeModuleId.replace(/\\/g, "/");

    this.accumulateCoverage(relativeSpecFile, sourcePaths);
  }

  /**
   * vitest v4 hook: called when the test run ends.
   * Skips writing output when there are unhandled errors, because the
   * accumulated coverage data may be incomplete.
   */
  onTestRunEnd(_testModules: unknown, unhandledErrors: unknown[]): void {
    if (unhandledErrors.length > 0) return;
    this.writeOutput();
  }

  /**
   * vitest v2/v3 hook: called on each batch of task updates.
   */
  onTaskUpdate(packs: TaskResultPack[]): void {
    for (const [taskId, , meta] of packs) {
      if (!meta || !Array.isArray(meta.perTestCoverage)) {
        continue;
      }
      const sourcePaths: string[] = meta.perTestCoverage;
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
  onFinished(_files: unknown, errors: unknown[]): void {
    if (errors.length > 0) return;
    this.writeOutput();
  }

  private accumulateCoverage(relativeSpecFile: string, sourcePaths: string[]): void {
    let covered = this.accumulator.get(relativeSpecFile);
    if (!covered) {
      covered = new Set<string>();
      this.accumulator.set(relativeSpecFile, covered);
    }
    for (const sourcePath of sourcePaths) {
      covered.add(sourcePath);
    }
  }

  private writeOutput(): void {
    const tests: Record<string, string[]> = {};
    for (const [specFile, sources] of this.accumulator) {
      tests[specFile] = Array.from(sources).sort();
    }
    const output: PerTestCoverageOutput = { version: 1, tests };
    const absoluteOutFile = resolve(this.projectRoot, this.outFile);
    writeFileSync(absoluteOutFile, JSON.stringify(output, null, 2) + "\n", "utf-8");
  }

  private toRelative(absolutePath: string): string {
    const prefix = this.projectRoot + "/";
    const relative = absolutePath.startsWith(prefix)
      ? absolutePath.slice(prefix.length)
      : absolutePath;
    return relative.replace(/\\/g, "/");
  }
}
