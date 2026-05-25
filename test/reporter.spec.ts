import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PerTestCoverageReporter } from "../src/reporter.js";
import type {
  VitestLike,
  TaskLike,
  TaskResultPackLike,
} from "../src/reporter.js";

function makeFakeVitest(root: string): VitestLike {
  const idMap = new Map<string, TaskLike>();
  return {
    config: { root },
    state: { idMap },
  };
}

function makeTestTask(_id: string, filepath: string): TaskLike {
  return {
    type: "test",
    file: { filepath },
  };
}

function makePack(
  id: string,
  sourcePaths: string[]
): TaskResultPackLike {
  return [id, undefined, { perTestCoverage: sourcePaths }];
}

describe("PerTestCoverageReporter", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "vcpt-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("throws when outFile is empty string", () => {
    expect(() => new PerTestCoverageReporter({ outFile: "" })).toThrowError(
      "outFile option is required"
    );
  });

  it("accumulates coverage from a single pack", () => {
    const outFile = join(tmpDir, "output.json");
    const projectRoot = tmpDir;
    const reporter = new PerTestCoverageReporter({ outFile });
    const ctx = makeFakeVitest(projectRoot);
    reporter.onInit(ctx);

    const task = makeTestTask("task-1", join(projectRoot, "tests/foo.spec.ts"));
    ctx.state.idMap.set("task-1", task);

    reporter.onTaskUpdate([
      makePack("task-1", ["src/used.ts"]),
    ]);
    reporter.onFinished(undefined, []);

    const written = JSON.parse(readFileSync(outFile, "utf-8")) as unknown;
    expect(written).toEqual({
      version: 1,
      tests: {
        "tests/foo.spec.ts": ["src/used.ts"],
      },
    });
  });

  it("deduplicates source files from multiple packs for the same spec", () => {
    const outFile = join(tmpDir, "output.json");
    const projectRoot = tmpDir;
    const reporter = new PerTestCoverageReporter({ outFile });
    const ctx = makeFakeVitest(projectRoot);
    reporter.onInit(ctx);

    const task1 = makeTestTask("task-1", join(projectRoot, "tests/foo.spec.ts"));
    const task2 = makeTestTask("task-2", join(projectRoot, "tests/foo.spec.ts"));
    ctx.state.idMap.set("task-1", task1);
    ctx.state.idMap.set("task-2", task2);

    reporter.onTaskUpdate([
      makePack("task-1", ["src/a.ts", "src/b.ts"]),
      makePack("task-2", ["src/b.ts", "src/c.ts"]),
    ]);
    reporter.onFinished(undefined, []);

    const written = JSON.parse(readFileSync(outFile, "utf-8")) as unknown;
    expect(written).toEqual({
      version: 1,
      tests: {
        "tests/foo.spec.ts": ["src/a.ts", "src/b.ts", "src/c.ts"],
      },
    });
  });

  it("separates coverage by spec file", () => {
    const outFile = join(tmpDir, "output.json");
    const projectRoot = tmpDir;
    const reporter = new PerTestCoverageReporter({ outFile });
    const ctx = makeFakeVitest(projectRoot);
    reporter.onInit(ctx);

    const task1 = makeTestTask("task-1", join(projectRoot, "tests/foo.spec.ts"));
    const task2 = makeTestTask("task-2", join(projectRoot, "tests/bar.spec.ts"));
    ctx.state.idMap.set("task-1", task1);
    ctx.state.idMap.set("task-2", task2);

    reporter.onTaskUpdate([
      makePack("task-1", ["src/used.ts"]),
      makePack("task-2", ["src/other.ts"]),
    ]);
    reporter.onFinished(undefined, []);

    const written = JSON.parse(readFileSync(outFile, "utf-8")) as unknown;
    expect(written).toEqual({
      version: 1,
      tests: {
        "tests/foo.spec.ts": ["src/used.ts"],
        "tests/bar.spec.ts": ["src/other.ts"],
      },
    });
  });

  it("skips packs without perTestCoverage meta", () => {
    const outFile = join(tmpDir, "output.json");
    const projectRoot = tmpDir;
    const reporter = new PerTestCoverageReporter({ outFile });
    const ctx = makeFakeVitest(projectRoot);
    reporter.onInit(ctx);

    reporter.onTaskUpdate([
      ["task-suite", undefined, {}],
    ]);
    reporter.onFinished(undefined, []);

    const written = JSON.parse(readFileSync(outFile, "utf-8")) as unknown;
    expect(written).toEqual({ version: 1, tests: {} });
  });

  it("skips suite tasks even if they have perTestCoverage", () => {
    const outFile = join(tmpDir, "output.json");
    const projectRoot = tmpDir;
    const reporter = new PerTestCoverageReporter({ outFile });
    const ctx = makeFakeVitest(projectRoot);
    reporter.onInit(ctx);

    const suiteTask: TaskLike = {
      type: "suite",
      file: { filepath: join(projectRoot, "tests/foo.spec.ts") },
    };
    ctx.state.idMap.set("suite-1", suiteTask);

    reporter.onTaskUpdate([
      makePack("suite-1", ["src/used.ts"]),
    ]);
    reporter.onFinished(undefined, []);

    const written = JSON.parse(readFileSync(outFile, "utf-8")) as unknown;
    expect(written).toEqual({ version: 1, tests: {} });
  });

  it("skips writing output when onFinished receives unhandled errors", () => {
    const outFile = join(tmpDir, "output.json");
    const projectRoot = tmpDir;
    const reporter = new PerTestCoverageReporter({ outFile });
    const ctx = makeFakeVitest(projectRoot);
    reporter.onInit(ctx);

    const task = makeTestTask("task-1", join(projectRoot, "tests/foo.spec.ts"));
    ctx.state.idMap.set("task-1", task);
    reporter.onTaskUpdate([makePack("task-1", ["src/used.ts"])]);

    reporter.onFinished(undefined, [new Error("worker crashed")]);

    expect(() => readFileSync(outFile, "utf-8")).toThrow();
  });

  it("writes version: 1 envelope", () => {
    const outFile = join(tmpDir, "output.json");
    const projectRoot = tmpDir;
    const reporter = new PerTestCoverageReporter({ outFile });
    const ctx = makeFakeVitest(projectRoot);
    reporter.onInit(ctx);

    reporter.onFinished(undefined, []);

    const written = JSON.parse(readFileSync(outFile, "utf-8")) as unknown;
    expect((written as { version: number }).version).toEqual(1);
  });

  it("writes output when onFinished is called with no arguments", () => {
    const outFile = join(tmpDir, "output.json");
    const projectRoot = tmpDir;
    const reporter = new PerTestCoverageReporter({ outFile });
    const ctx = makeFakeVitest(projectRoot);
    reporter.onInit(ctx);

    reporter.onFinished();

    const written = JSON.parse(readFileSync(outFile, "utf-8")) as unknown;
    expect(written).toEqual({ version: 1, tests: {} });
  });
});
