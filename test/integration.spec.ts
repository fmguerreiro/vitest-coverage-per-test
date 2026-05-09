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
