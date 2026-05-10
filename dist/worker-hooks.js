import inspector from "node:inspector";
import { fileURLToPath } from "node:url";
import { beforeEach, afterEach } from "vitest";
/**
 * V8 Inspector session kept open for the lifetime of the worker.
 * Opened lazily on first installPerTestCoverageHooks() call.
 */
let activeSession = null;
/**
 * Per-task baseline snapshots. Keyed on the task object so concurrent tests
 * cannot corrupt each other, and so the Map is never serialized over IPC.
 */
const baselines = new WeakMap();
const projectRoot = process.cwd();
async function openSession() {
    if (activeSession) {
        return activeSession;
    }
    const session = new inspector.Session();
    session.connect();
    await new Promise((resolve, reject) => {
        session.post("Profiler.enable", (error) => {
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
    await new Promise((resolve, reject) => {
        session.post("Profiler.startPreciseCoverage", { callCount: true, detailed: false }, (error) => {
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
    activeSession = session;
    return activeSession;
}
function sumCallCounts(scripts) {
    const counts = new Map();
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
async function takeSnapshot(session) {
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
function fileUrlToProjectRelative(fileUrl) {
    const absolutePath = fileURLToPath(fileUrl);
    const prefix = projectRoot + "/";
    if (!absolutePath.startsWith(prefix)) {
        return null;
    }
    return absolutePath.slice(prefix.length).replace(/\\/g, "/");
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
 *
 * Requires coverage.provider: "v8" in your vitest config.
 * Safe for concurrent tests (it.concurrent): the baseline is stored on each
 * test's own context.task.meta rather than in shared module state.
 */
export function installPerTestCoverageHooks() {
    beforeEach(async (context) => {
        const session = await openSession();
        baselines.set(context.task, await takeSnapshot(session));
    });
    afterEach(async (context) => {
        const session = await openSession();
        const current = await takeSnapshot(session);
        const baseline = baselines.get(context.task) ?? new Map();
        const coveredFiles = [];
        for (const [url, count] of current) {
            const baseCount = baseline.get(url) ?? 0;
            if (count > baseCount) {
                const relative = fileUrlToProjectRelative(url);
                if (relative !== null) {
                    coveredFiles.push(relative);
                }
            }
        }
        context.task.meta.perTestCoverage = coveredFiles;
    });
}
//# sourceMappingURL=worker-hooks.js.map