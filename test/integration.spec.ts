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

describe("integration: basic-project", () => {
  it("produces per-test coverage JSON with correct structure", async () => {
    // Clean up any previous run
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
    expect(typeof output.tests).toEqual("object");

    const testKeys = Object.keys(output.tests);

    // Both spec files should have entries
    const mathKey = testKeys.find((k) => k.includes("math.spec.ts"));
    const stringsKey = testKeys.find((k) => k.includes("strings.spec.ts"));

    expect(mathKey).not.toBeUndefined();
    expect(stringsKey).not.toBeUndefined();

    // math spec should cover math source (not strings)
    const mathCoverage = output.tests[mathKey!];
    expect(Array.isArray(mathCoverage)).toEqual(true);
    expect(mathCoverage.some((p) => p.includes("math.ts"))).toEqual(true);
    expect(mathCoverage.every((p) => !p.includes("strings.ts"))).toEqual(true);

    // strings spec should cover strings source (not math)
    const stringsCoverage = output.tests[stringsKey!];
    expect(Array.isArray(stringsCoverage)).toEqual(true);
    expect(stringsCoverage.some((p) => p.includes("strings.ts"))).toEqual(true);
    expect(stringsCoverage.every((p) => !p.includes("math.ts"))).toEqual(true);

    // All paths are project-relative and forward-slash
    for (const paths of Object.values(output.tests)) {
      for (const sourcePath of paths) {
        expect(sourcePath.startsWith("/")).toEqual(false);
        expect(sourcePath.includes("\\")).toEqual(false);
      }
    }
  }, 60_000);
});
