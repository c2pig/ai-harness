import { cp } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");

await cp(
  join(root, "packages", "adapters-mock", "fixtures"),
  join(root, "packages", "adapters-mock", "dist", "fixtures"),
  { recursive: true },
);
