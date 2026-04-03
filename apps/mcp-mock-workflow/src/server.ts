import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { FixtureRecordsApiMock, ScenarioSignalsMcpMock } from "@agent-harness/adapters-mock";
import type { OrchestrationState, SkillContext } from "@agent-harness/adapters-mock";
import { compilePayloadSkill } from "./skills/compilePayload.js";
import { detectGapsSkill } from "./skills/detectGaps.js";
import { fetchCandidateSignalsSkill } from "./skills/fetchCandidateSignals.js";
import { fetchJobSummarySkill } from "./skills/fetchJobSummary.js";
import { fetchScenarioSignalsSkill } from "./skills/fetchScenarioSignals.js";
import { rankVariantsSkill } from "./skills/rankVariants.js";

const orchestrationSchema = {
  orchestration: z.any(),
};

function makeCtx(): SkillContext {
  const api = new FixtureRecordsApiMock();
  const mcp = new ScenarioSignalsMcpMock();
  const log = (m: string, e?: Record<string, unknown>) =>
    console.error(m, e ? JSON.stringify(e) : "");
  return {
    api: {
      getJobSummary: (jobId) => api.getJobSummary(jobId),
      getCandidateSignals: (matchId) => api.getCandidateSignals(matchId),
    },
    mcp: {
      getScenarioSignals: (scenarioId) => mcp.getScenarioSignals(scenarioId),
    },
    logger: {
      info: log,
      error: log,
      debug: log,
    },
  };
}

function toolResponse(next: OrchestrationState) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ orchestration: next }),
      },
    ],
  };
}

async function runSkill(
  state: OrchestrationState,
  skill: {
    run: (s: OrchestrationState, c: SkillContext) => Promise<OrchestrationState>;
  },
): Promise<ReturnType<typeof toolResponse>> {
  const next = await skill.run(state, makeCtx());
  return toolResponse(next);
}

const mcpServer = new McpServer({
  name: "mcp-mock-workflow",
  version: "0.2.0",
});

mcpServer.registerTool(
  "fetchJobSummary",
  {
    description:
      "Load job summary (title, requirements, salary, location) for the workflow context.",
    inputSchema: orchestrationSchema,
  },
  async ({ orchestration }) =>
    runSkill(orchestration as OrchestrationState, fetchJobSummarySkill),
);

mcpServer.registerTool(
  "fetchCandidateSignals",
  {
    description:
      "Load contact/match signals: CV highlights, rejections, interview feedback.",
    inputSchema: orchestrationSchema,
  },
  async ({ orchestration }) =>
    runSkill(orchestration as OrchestrationState, fetchCandidateSignalsSkill),
);

mcpServer.registerTool(
  "fetchScenarioSignals",
  {
    description: "Load MCP scenario signals (cross-sell list, market benchmarks).",
    inputSchema: orchestrationSchema,
  },
  async ({ orchestration }) =>
    runSkill(orchestration as OrchestrationState, fetchScenarioSignalsSkill),
);

mcpServer.registerTool(
  "detectGaps",
  {
    description: "Compare scenario required/optional fields against gathered evidence.",
    inputSchema: orchestrationSchema,
  },
  async ({ orchestration }) =>
    runSkill(orchestration as OrchestrationState, detectGapsSkill),
);

mcpServer.registerTool(
  "compilePayload",
  {
    description: "Build canonical payload object from evidence for drafting and variants.",
    inputSchema: orchestrationSchema,
  },
  async ({ orchestration }) =>
    runSkill(orchestration as OrchestrationState, compilePayloadSkill),
);

mcpServer.registerTool(
  "rankVariants",
  {
    description: "Produce three ranked reply variants (styles + key points) for HITL.",
    inputSchema: orchestrationSchema,
  },
  async ({ orchestration }) =>
    runSkill(orchestration as OrchestrationState, rankVariantsSkill),
);

async function main() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
