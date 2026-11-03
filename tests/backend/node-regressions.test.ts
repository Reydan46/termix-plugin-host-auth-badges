/** Bridge existing no-dependency Node regression suites into the official
 * Termix plugin CI, which invokes `termix-plugin test` (Vitest).
 * Keep the detailed suites runnable with `npm test` for local debugging.
 */
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { test, expect } from "vitest";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("standalone Node regression suites pass under the Termix CI runner", () => {
  const names = readdirSync(join(root, "tests"))
    .filter((name) => name.endsWith(".test.mjs"))
    .map((name) => join(root, "tests", name));
  expect(names.length).toBeGreaterThan(10);
  const result = spawnSync(process.execPath, ["--experimental-strip-types", "--test", ...names], {
    cwd: root,
    encoding: "utf8",
    timeout: 120_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`Node tests failed (status ${result.status}):\n${result.error ?? ""}\n${result.stdout}\n${result.stderr}`);
  }
  expect(result.status).toBe(0);
});
