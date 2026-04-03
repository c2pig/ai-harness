import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Monorepo root (agent-harness-poc). */
export function monorepoRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "..", "..", "..");
}

export function mcpMockWorkflowScriptPath(): string {
  return join(monorepoRoot(), "dist", "apps", "mcp-mock-workflow", "server.js");
}

/** @deprecated use mcpMockWorkflowScriptPath */
export function mcpMockHirerScriptPath(): string {
  return mcpMockWorkflowScriptPath();
}

/** @deprecated use mcpMockWorkflowScriptPath */
export function hirerEngageMcpServerScriptPath(): string {
  return mcpMockWorkflowScriptPath();
}

export function mcpToolsGenericScriptPath(): string {
  return join(monorepoRoot(), "dist", "apps", "mcp-tools-generic", "server.js");
}

export function skillCataloguePath(): string {
  return join(monorepoRoot(), "skill-catalogues", "sample-catalog");
}

/** @deprecated use skillCataloguePath */
export function hirerEngageCataloguePath(): string {
  return skillCataloguePath();
}

export function demoWebStaticPath(): string {
  return join(monorepoRoot(), "apps", "demo-web", "public");
}
