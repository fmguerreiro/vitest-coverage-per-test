# vitest-coverage-per-test

Vitest reporter that emits per-test runtime coverage attribution as JSON. Each test file gets mapped to the set of source files it actually exercised at runtime.

Vitest's built-in v8 reporter merges per-test coverage into a single aggregate `coverage-final.json` before any reporter sees it. This package snapshots V8 coverage between tests via `node:v8`'s `takeCoverage()` and writes a per-test breakdown.

## Why

Static analyzers like [tdad-ts](https://github.com/fmguerreiro/tdad-ts) and similar test-impact tools need per-test coverage to flag tests at risk when a source file changes through dynamic dispatch, registry lookups, or routing — paths that static `import` traversal misses. Aggregate coverage doesn't tell you *which* test exercised the source.

## Output shape

```json
{
  "version": 1,
  "tests": {
    "tests/foo.spec.ts": ["src/used.ts", "src/other.ts"],
    "tests/bar.spec.ts": ["src/lib/helper.ts"]
  }
}
```

Paths are project-relative, forward-slash. Each value is the deduped set of source files covered while that test file ran.

## Status

Pre-release. Single reporter, V8 provider only (`@vitest/coverage-v8`). Istanbul provider not supported.

## Install (github pin)

```bash
npm install --save-dev "github:fmguerreiro/vitest-coverage-per-test#<sha>"
```

The package builds its `dist/` on install via the `prepare` script.

## Usage

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import { perTestCoverageReporter } from "vitest-coverage-per-test";

export default defineConfig({
  test: {
    pool: "forks",
    isolate: true,
    coverage: {
      enabled: true,
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["**/*.spec.ts", "**/*.test.ts", "**/test-utils/**"],
    },
    reporters: [
      "default",
      perTestCoverageReporter({ outFile: ".coverage-per-test.json" }),
    ],
  },
});
```

Run `vitest run --coverage` and the reporter writes `outFile` at the end. Coverage data is keyed by the spec file path, project-relative.

## How it works

1. Vitest sets `NODE_V8_COVERAGE` automatically when coverage is on.
2. A worker-side `afterEach` hook calls `node:v8`'s `takeCoverage()` to flush per-test coverage events. The delta is the set of source URLs touched while that test ran.
3. The hook writes the delta to `task.meta`, which vitest carries from worker to main process.
4. The reporter's `onTestCaseResult` hook reads `task.meta`, remaps V8's transpiled URLs back to original `.ts` source paths via `@ampproject/remapping`, deduplicates per spec file, and accumulates.
5. `onTestRunEnd` writes the JSON.

## Limitations

- V8 provider only. Istanbul instrumentation produces a different shape and is out of scope.
- Requires `isolate: true` and `pool: "forks"` (vitest defaults). With `isolate: false` per-test V8 coverage is unreliable; the reporter throws on detection.
- Dynamic imports are captured if they execute before the test ends. Lazy imports loaded asynchronously after `afterEach` are not.
- Excluded files (per `coverage.exclude`) never appear in the output even if loaded.

## License

MIT.
