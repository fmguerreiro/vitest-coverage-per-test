/**
 * Integration: runs vitest programmatically against test/fixtures/basic-project
 * and asserts the resulting per-test coverage JSON has the expected structure.
 *
 * Smoke command (manual):
 *   cd test/fixtures/basic-project && npx vitest run --coverage
 *   # then inspect .coverage-per-test.json
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { startVitest } from "vitest/node";
import type { PerTestCoverageOutput } from "../src/types.js";

const fixtureRoot = resolve(import.meta.dirname, "fixtures/basic-project");
const outFile = resolve(fixtureRoot, ".coverage-per-test.json");

const concurrentFixtureRoot = resolve(import.meta.dirname, "fixtures/concurrent-project");
const concurrentOutFile = resolve(concurrentFixtureRoot, ".coverage-per-test.json");

describe("integration: basic-project", () => {
  it("produces per-test coverage JSON with correct structure", async () => {
    if (existsSync(outFile)) {
      rmSync(outFile, { force: true });
    }

    const vitest = await startVitest("test", [], {
      root: fixtureRoot,
      config: resolve(fixtureRoot, "vitest.config.ts"),
      run: true,
    });

    await vitest?.close();

    expect(existsSync(outFile)).toEqual(true);

    const output = JSON.parse(readFileSync(outFile, "utf-8")) as PerTestCoverageOutput;

    expect(output.version).toEqual(1);

    const testKeys = Object.keys(output.tests);

    const mathKey = testKeys.find((k) => k.includes("math.spec.ts"));
    const stringsKey = testKeys.find((k) => k.includes("strings.spec.ts"));

    expect(typeof mathKey).toEqual("string");
    expect(typeof stringsKey).toEqual("string");

    const mathCoverage = output.tests[mathKey!]!;
    const stringsCoverage = output.tests[stringsKey!]!;

    // math spec covers its own source file
    expect(mathCoverage.some((p) => p.endsWith("math.ts"))).toEqual(true);
    // math spec does not cover strings source
    expect(mathCoverage.every((p) => !p.endsWith("strings.ts"))).toEqual(true);

    // strings spec covers its own source file
    expect(stringsCoverage.some((p) => p.endsWith("strings.ts"))).toEqual(true);
    // strings spec does not cover math source
    expect(stringsCoverage.every((p) => !p.endsWith("math.ts"))).toEqual(true);

    // All paths are project-relative and forward-slash
    for (const paths of Object.values(output.tests)) {
      for (const sourcePath of paths) {
        expect(sourcePath.startsWith("/")).toEqual(false);
        expect(sourcePath.includes("\\")).toEqual(false);
      }
    }
  }, 60_000);
});

describe("integration: concurrent-project", () => {
  it("attributes coverage to each spec file under it.concurrent", async () => {
    if (existsSync(concurrentOutFile)) {
      rmSync(concurrentOutFile, { force: true });
    }

    const vitest = await startVitest("test", [], {
      root: concurrentFixtureRoot,
      config: resolve(concurrentFixtureRoot, "vitest.config.ts"),
      run: true,
    });

    await vitest?.close();

    expect(existsSync(concurrentOutFile)).toEqual(true);

    const output = JSON.parse(readFileSync(concurrentOutFile, "utf-8")) as PerTestCoverageOutput;

    expect(output.version).toEqual(1);

    const testKeys = Object.keys(output.tests);
    const concurrentKey = testKeys.find((k) => k.includes("concurrent.spec.ts"));
    expect(typeof concurrentKey).toEqual("string");

    const coverage = output.tests[concurrentKey!]!;

    // Both alpha and beta were called during the spec file's run.
    // With it.concurrent, V8 coverage is process-wide, so both files
    // appear under the single spec key — isolation is per-spec-file,
    // not per-concurrent-test-case.
    expect(coverage.some((p) => p.endsWith("alpha.ts"))).toEqual(true);
    expect(coverage.some((p) => p.endsWith("beta.ts"))).toEqual(true);
  }, 60_000);
});
