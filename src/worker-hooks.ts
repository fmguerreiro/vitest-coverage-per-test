import inspector from "node:inspector";
import { fileURLToPath } from "node:url";
import { beforeEach, afterEach } from "vitest";

type ScriptCoverage = inspector.Profiler.ScriptCoverage;

/**
 * V8 Inspector session kept open for the lifetime of the worker.
 * Opened lazily on first call to installPerTestCoverageHooks().
 */
let activeSession: inspector.Session | null = null;

/**
 * URL-keyed baseline of summed call counts taken before each test.
 */
let baseline: Map<string, number> = new Map();

function openSession(): inspector.Session {
  if (activeSession) {
    return activeSession;
  }
  activeSession = new inspector.Session();
  activeSession.connect();
  activeSession.post("Profiler.enable", undefined, () => {});
  activeSession.post(
    "Profiler.startPreciseCoverage",
    { callCount: true, detailed: false },
    () => {}
  );
  return activeSession;
}

function sumCallCounts(scripts: ScriptCoverage[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const script of scripts) {
    if (!script.url.startsWith("file://")) {
      continue;
    }
    if (script.url.includes("/node_modules/")) {
      continue;
    }
    let total = 0;
    for (const fn of script.functions) {
      for (const range of fn.ranges) {
        total += range.count;
      }
    }
    counts.set(script.url, total);
  }
  return counts;
}

async function takeSnapshot(session: inspector.Session): Promise<Map<string, number>> {
  return new Promise((resolve, reject) => {
    session.post("Profiler.takePreciseCoverage", (error, coverage) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(sumCallCounts(coverage.result));
    });
  });
}

function fileUrlToProjectRelative(fileUrl: string): string {
  const absolutePath = fileURLToPath(fileUrl);
  const projectRoot = process.cwd();
  const prefix = projectRoot + "/";
  const relative = absolutePath.startsWith(prefix)
    ? absolutePath.slice(prefix.length)
    : absolutePath;
  return relative.replace(/\\/g, "/");
}

/**
 * Installs global beforeEach/afterEach hooks that snapshot V8 coverage
 * between tests and stash the per-test delta in task.meta.perTestCoverage.
 *
 * Add this to your vitest setupFiles:
 *
 * ```ts
 * import { installPerTestCoverageHooks } from "vitest-coverage-per-test";
 * installPerTestCoverageHooks();
 * ```
 */
export function installPerTestCoverageHooks(): void {
  beforeEach(async () => {
    const session = openSession();
    baseline = await takeSnapshot(session);
  });

  afterEach(async (context) => {
    const session = openSession();
    const current = await takeSnapshot(session);

    const coveredFiles: string[] = [];
    for (const [url, count] of current) {
      const baseCount = baseline.get(url) ?? 0;
      if (count > baseCount) {
        coveredFiles.push(fileUrlToProjectRelative(url));
      }
    }

    context.task.meta.perTestCoverage = coveredFiles;
  });
}
