import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Resolve `fixtures/` next to emitted JS under `dist/`, or `../fixtures` when running from `src/`. */
function fixturesDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const besideEmit = join(here, "fixtures");
  if (existsSync(besideEmit)) return besideEmit;
  return join(here, "..", "fixtures");
}

export function loadFixtureJson<T = unknown>(filename: string): T {
  const path = join(fixturesDir(), filename);
  return JSON.parse(readFileSync(path, "utf8")) as T;
}
