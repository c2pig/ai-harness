import express from "express";
import { MemorySaver } from "@langchain/langgraph-checkpoint";
import type { CloudWatchLogSink } from "@agent-harness/observability";
import { CloudWatchLogSink as CloudWatchLogSinkClass } from "@agent-harness/observability";
import type { LoggerLike } from "@agent-harness/observability";
import { loadSkillCatalogue } from "@agent-harness/skill-loader";
import { InMemoryRunStore } from "@agent-harness/orchestration-engine";
import {
  createMandatoryChatModel,
  McpClientPool,
  type SkillRuntimeDeps,
} from "@agent-harness/ai-harness";
import type { LongTermMemoryClient } from "@agent-harness/contracts";
import { getGatewayEnv } from "@agent-harness/adapters-llm";
import {
  demoWebStaticPath,
  skillCataloguePath,
  mcpMockWorkflowScriptPath,
  mcpToolsGenericScriptPath,
} from "./paths.js";
import { createHarnessLogger } from "./runLogger.js";
import type { DemoApiDeps } from "./routes/deps.js";
import { registerMetaRoutes } from "./routes/metaRoutes.js";
import { registerResumeRoute } from "./routes/resumeRoute.js";
import { registerRunRoutes } from "./routes/runRoutes.js";

const consoleLogger: LoggerLike = {
  info: (obj, msg) => {
    console.log(msg, obj);
  },
  error: (obj, msg) => {
    console.error(msg, obj);
  },
};

function assertGatewayKey(): void {
  const k = process.env.LLM_API_KEY ?? "";
  if (!k.trim()) {
    throw new Error("LLM_API_KEY is required and must be non-empty");
  }
}

export type CreateAppResult = {
  app: express.Express;
  mcpPool: McpClientPool;
};

export async function createApp(): Promise<CreateAppResult> {
  assertGatewayKey();
  const gatewayEnv = getGatewayEnv();
  const llm = createMandatoryChatModel();
  const checkpointer = new MemorySaver();

  const mcpLaunchers = {
    "mcp-mock-workflow": {
      command: process.execPath,
      args: [mcpMockWorkflowScriptPath()],
    },
    "mcp-tools-generic": {
      command: process.execPath,
      args: [mcpToolsGenericScriptPath()],
    },
  };

  const mcpPool = new McpClientPool(mcpLaunchers);

  let longTermMemory: LongTermMemoryClient | undefined;
  if (process.env.MEMORY_ENABLED === "true") {
    try {
      const memoryMod = await import("@agent-harness/memory");
      longTermMemory = await memoryMod.createLongTermMemoryClient();
      await memoryMod.seedDemoData(longTermMemory);
      consoleLogger.info(
        {},
        "Long-term memory (Mem0) enabled: client ready and demo data seeded.",
      );
    } catch (err) {
      consoleLogger.error(
        { err: err instanceof Error ? err.message : String(err) },
        "Long-term memory init failed; continuing without Mem0.",
      );
    }
  }

  const skillRuntime: SkillRuntimeDeps = {
    llm,
    checkpointer,
    mcpPool,
    ...(longTermMemory ? { longTermMemory } : {}),
  };

  const app = express();
  app.use(express.json());

  const cataloguePath = skillCataloguePath();
  const skillsCatalog = await loadSkillCatalogue(cataloguePath);
  const store = new InMemoryRunStore();

  const cwGroup = process.env.HARNESS_CW_LOG_GROUP;
  const cwSink: CloudWatchLogSink | null =
    cwGroup && process.env.AWS_REGION
      ? new CloudWatchLogSinkClass({
          logGroupName: cwGroup,
          streamNamePrefix:
            process.env.HARNESS_CW_STREAM_PREFIX ?? "harness-demo-local",
          region: process.env.AWS_REGION,
        })
      : null;

  const harnessComponent =
    process.env.HARNESS_COMPONENT?.trim() || "aiHarnessDemo";
  const harnessLogger = createHarnessLogger(
    harnessComponent,
    consoleLogger,
    cwSink,
  );

  const publicDir = demoWebStaticPath();
  app.use(express.static(publicDir));

  const deps: DemoApiDeps = {
    store,
    skillsCatalog,
    skillRuntime,
    mcpPool,
    gatewayEnv,
    cwSink,
    cataloguePath,
    publicDir,
    harnessLogger,
    consoleLogger,
  };

  registerMetaRoutes(app, deps);
  registerRunRoutes(app, deps);
  registerResumeRoute(app, deps);

  return { app, mcpPool };
}
