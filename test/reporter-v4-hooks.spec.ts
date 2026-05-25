import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PerTestCoverageReporter } from "../src/reporter.js";

interface TestCaseLike {
  type: "test";
  meta(): { perTestCoverage?: string[] };
  module: { relativeModuleId: string };
}

function makeTestCase(
  relativeModuleId: string,
  perTestCoverage: string[] | undefined
): TestCaseLike {
  return {
    type: "test",
    meta: () => ({ perTestCoverage }),
    module: { relativeModuleId },
  };
}

describe("PerTestCoverageReporter vitest v4 hooks", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "vcpt-v4-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("accumulates coverage from a conforming TestCase keyed by spec file", () => {
    const outFile = join(tmpDir, "output.json");
    const reporter = new PerTestCoverageReporter({ outFile });

    reporter.onTestCaseResult(makeTestCase("tests/foo.spec.ts", ["src/used.ts"]));
    reporter.onTestRunEnd(undefined, []);

    const written = JSON.parse(readFileSync(outFile, "utf-8")) as unknown;
    expect(written).toEqual({
      version: 1,
      tests: {
        "tests/foo.spec.ts": ["src/used.ts"],
      },
    });
  });

  it("deduplicates and sorts source files across TestCases for the same spec", () => {
    const outFile = join(tmpDir, "output.json");
    const reporter = new PerTestCoverageReporter({ outFile });

    reporter.onTestCaseResult(makeTestCase("tests/foo.spec.ts", ["src/b.ts", "src/a.ts"]));
    reporter.onTestCaseResult(makeTestCase("tests/foo.spec.ts", ["src/a.ts", "src/c.ts"]));
    reporter.onTestRunEnd(undefined, []);

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
    const reporter = new PerTestCoverageReporter({ outFile });

    reporter.onTestCaseResult(makeTestCase("tests/foo.spec.ts", ["src/used.ts"]));
    reporter.onTestCaseResult(makeTestCase("tests/bar.spec.ts", ["src/other.ts"]));
    reporter.onTestRunEnd(undefined, []);

    const written = JSON.parse(readFileSync(outFile, "utf-8")) as unknown;
    expect(written).toEqual({
      version: 1,
      tests: {
        "tests/foo.spec.ts": ["src/used.ts"],
        "tests/bar.spec.ts": ["src/other.ts"],
      },
    });
  });

  it("normalizes backslash module ids to forward slashes", () => {
    const outFile = join(tmpDir, "output.json");
    const reporter = new PerTestCoverageReporter({ outFile });

    reporter.onTestCaseResult(makeTestCase("tests\\nested\\foo.spec.ts", ["src/used.ts"]));
    reporter.onTestRunEnd(undefined, []);

    const written = JSON.parse(readFileSync(outFile, "utf-8")) as unknown;
    expect(written).toEqual({
      version: 1,
      tests: {
        "tests/nested/foo.spec.ts": ["src/used.ts"],
      },
    });
  });

  it("skips a TestCase whose perTestCoverage is an empty array", () => {
    const outFile = join(tmpDir, "output.json");
    const reporter = new PerTestCoverageReporter({ outFile });

    reporter.onTestCaseResult(makeTestCase("tests/foo.spec.ts", []));
    reporter.onTestRunEnd(undefined, []);

    const written = JSON.parse(readFileSync(outFile, "utf-8")) as unknown;
    expect(written).toEqual({ version: 1, tests: {} });
  });

  it("skips a TestCase whose perTestCoverage is absent", () => {
    const outFile = join(tmpDir, "output.json");
    const reporter = new PerTestCoverageReporter({ outFile });

    reporter.onTestCaseResult(makeTestCase("tests/foo.spec.ts", undefined));
    reporter.onTestRunEnd(undefined, []);

    const written = JSON.parse(readFileSync(outFile, "utf-8")) as unknown;
    expect(written).toEqual({ version: 1, tests: {} });
  });

  it("skips input whose type is not test", () => {
    const outFile = join(tmpDir, "output.json");
    const reporter = new PerTestCoverageReporter({ outFile });

    reporter.onTestCaseResult({
      type: "suite",
      meta: () => ({ perTestCoverage: ["src/used.ts"] }),
      module: { relativeModuleId: "tests/foo.spec.ts" },
    });
    reporter.onTestRunEnd(undefined, []);

    const written = JSON.parse(readFileSync(outFile, "utf-8")) as unknown;
    expect(written).toEqual({ version: 1, tests: {} });
  });

  it("skips input missing the module field", () => {
    const outFile = join(tmpDir, "output.json");
    const reporter = new PerTestCoverageReporter({ outFile });

    reporter.onTestCaseResult({
      type: "test",
      meta: () => ({ perTestCoverage: ["src/used.ts"] }),
    });
    reporter.onTestRunEnd(undefined, []);

    const written = JSON.parse(readFileSync(outFile, "utf-8")) as unknown;
    expect(written).toEqual({ version: 1, tests: {} });
  });

  it("skips input missing the meta function", () => {
    const outFile = join(tmpDir, "output.json");
    const reporter = new PerTestCoverageReporter({ outFile });

    reporter.onTestCaseResult({
      type: "test",
      module: { relativeModuleId: "tests/foo.spec.ts" },
    });
    reporter.onTestRunEnd(undefined, []);

    const written = JSON.parse(readFileSync(outFile, "utf-8")) as unknown;
    expect(written).toEqual({ version: 1, tests: {} });
  });

  it("skips non-object input", () => {
    const outFile = join(tmpDir, "output.json");
    const reporter = new PerTestCoverageReporter({ outFile });

    reporter.onTestCaseResult(undefined);
    reporter.onTestCaseResult(null);
    reporter.onTestCaseResult("test");
    reporter.onTestRunEnd(undefined, []);

    const written = JSON.parse(readFileSync(outFile, "utf-8")) as unknown;
    expect(written).toEqual({ version: 1, tests: {} });
  });

  it("writes output on onTestRunEnd when there are no unhandled errors", () => {
    const outFile = join(tmpDir, "output.json");
    const reporter = new PerTestCoverageReporter({ outFile });

    reporter.onTestRunEnd(undefined, []);

    const written = JSON.parse(readFileSync(outFile, "utf-8")) as unknown;
    expect(written).toEqual({ version: 1, tests: {} });
  });

  it("writes output on onTestRunEnd when unhandledErrors is omitted", () => {
    const outFile = join(tmpDir, "output.json");
    const reporter = new PerTestCoverageReporter({ outFile });

    reporter.onTestRunEnd(undefined);

    const written = JSON.parse(readFileSync(outFile, "utf-8")) as unknown;
    expect(written).toEqual({ version: 1, tests: {} });
  });

  it("skips writing output when onTestRunEnd receives unhandled errors", () => {
    const outFile = join(tmpDir, "output.json");
    const reporter = new PerTestCoverageReporter({ outFile });

    reporter.onTestCaseResult(makeTestCase("tests/foo.spec.ts", ["src/used.ts"]));
    reporter.onTestRunEnd(undefined, [new Error("worker crashed")]);

    expect(() => readFileSync(outFile, "utf-8")).toThrow();
  });
});
