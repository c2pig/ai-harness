import type { McpClientPool, SkillRuntimeDeps } from "@agent-harness/ai-harness";
import type { InMemoryRunStore } from "@agent-harness/orchestration-engine";
import type { LoggerLike } from "@agent-harness/observability";
import type { CloudWatchLogSink } from "@agent-harness/observability";
import type { LoadedSkill } from "@agent-harness/skill-loader";
import type { HarnessLogger } from "../runLogger.js";

export type DemoApiDeps = {
  store: InMemoryRunStore;
  skillsCatalog: Map<string, LoadedSkill>;
  skillRuntime: SkillRuntimeDeps;
  mcpPool: McpClientPool;
  gatewayEnv: { baseURL: string; apiKey: string; model: string };
  cwSink: CloudWatchLogSink | null;
  cataloguePath: string;
  publicDir: string;
  harnessLogger: HarnessLogger;
  consoleLogger: LoggerLike;
};
