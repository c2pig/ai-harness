import type { BaseMessage } from "@langchain/core/messages";
import type { ChatOpenAI } from "@langchain/openai";
import type { MemorySaver } from "@langchain/langgraph-checkpoint";
import type { LongTermMemoryClient } from "@agent-harness/contracts";
import type { LoadedSkill } from "@agent-harness/skill-loader";
import type { McpClientPool } from "./mcpClientPool.js";

export type { McpLauncherConfig } from "./mcpClientPool.js";

/** How to spawn an MCP server (stdio). */
export interface McpServerLauncher {
  command: string;
  args: string[];
}

export interface ToolTraceEntry {
  name: string;
  argsDigest?: string;
  resultPreview?: string;
  durationMs?: number;
  error?: string;
}

export interface SkillInvocationInput {
  skill: LoadedSkill;
  /** Primary user text */
  userMessage: string;
  /** Optional JSON context (injected into system prompt) */
  context: Record<string, unknown>;
  threadId: string;
  phase: "initial" | "resume";
  resume?: {
    decision: "approve" | "reject" | "edit";
    correctionText?: string;
  };
}

export interface SkillInvocationResult {
  status: "completed" | "hitl_pending";
  /** Last assistant text (best effort) */
  resultText?: string;
  messages: BaseMessage[];
  messagesPreview: unknown[];
  toolTrace: ToolTraceEntry[];
}

/** Pino-like sink for non-fatal skill runtime errors (e.g. long-term memory persist). */
export interface SkillRuntimeErrorLogger {
  error: (obj: Record<string, unknown>, msg: string) => void;
}

export interface SkillRuntimeDeps {
  llm: ChatOpenAI;
  checkpointer: MemorySaver;
  mcpPool: McpClientPool;
  /** When set, runSkillInvocation enriches the system prompt from Mem0 (or compatible) search. */
  longTermMemory?: LongTermMemoryClient;
  /** When set, long-term memory persist failures are logged here instead of being silent. */
  errorLogger?: SkillRuntimeErrorLogger;
}
