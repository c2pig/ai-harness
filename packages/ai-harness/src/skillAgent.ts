import { HumanMessage } from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";
import type { DynamicStructuredTool } from "@langchain/core/tools";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import type { LoadedSkill } from "@agent-harness/skill-loader";
import { discoverMcpTools } from "./mcpToolAdapter.js";
import type {
  SkillInvocationInput,
  SkillInvocationResult,
  SkillRuntimeDeps,
  ToolTraceEntry,
} from "./types.js";

const LONG_TERM_MEMORY_MAX_LINES = 12;

function buildSystemPrompt(
  skill: LoadedSkill,
  context: Record<string, unknown>,
  longTermMemoryBlock: string,
): string {
  const memBlock =
    longTermMemoryBlock.trim().length > 0
      ? `\n\n## Long-term memory\n${longTermMemoryBlock.trim()}\n`
      : "";
  const ctxBlock =
    context && Object.keys(context).length > 0
      ? `\n\n## Context (JSON)\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\`\n`
      : "";
  return `${skill.body.trim()}${memBlock}${ctxBlock}`;
}

async function buildLongTermMemoryBlock(
  deps: SkillRuntimeDeps,
  context: Record<string, unknown>,
  searchQuery: string,
): Promise<string> {
  if (!deps.longTermMemory) return "";
  const uid = context.mem0UserId;
  if (typeof uid !== "string" || !uid.trim()) return "";
  try {
    const { results } = await deps.longTermMemory.search(searchQuery.trim() || ".", {
      userId: uid.trim(),
      limit: 8,
    });
    if (!results.length) return "";
    return results
      .map((r, i) => `${i + 1}. ${r.memory}`)
      .slice(0, LONG_TERM_MEMORY_MAX_LINES)
      .join("\n");
  } catch {
    return "";
  }
}

function messagesPreview(messages: BaseMessage[]): unknown[] {
  return messages.map((m) => ({
    type: m.getType(),
    content: m.content,
  }));
}

function lastAssistantText(messages: BaseMessage[]): string | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m.getType() === "ai") {
      const c = m.content;
      if (typeof c === "string") return c;
      if (Array.isArray(c)) {
        return c
          .map((part) =>
            typeof part === "object" && part && "text" in part
              ? String((part as { text: string }).text)
              : "",
          )
          .join("");
      }
    }
  }
  return undefined;
}

function resumeHumanText(resume: NonNullable<SkillInvocationInput["resume"]>): string {
  const parts = [
    `Human review decision: ${resume.decision}.`,
    resume.correctionText?.trim()
      ? `Additional instructions / edited text:\n${resume.correctionText.trim()}`
      : "",
  ];
  return parts.filter(Boolean).join("\n\n");
}

/**
 * Run one phase of a skill: initial user turn, or HITL resume turn.
 * Uses LangGraph ReAct + MCP tools + MemorySaver thread id.
 */
export async function runSkillInvocation(
  input: SkillInvocationInput,
  deps: SkillRuntimeDeps,
): Promise<SkillInvocationResult> {
  const { skill, userMessage, context, threadId, phase, resume } = input;
  const { llm, checkpointer, mcpPool } = deps;
  const toolTrace: ToolTraceEntry[] = [];
  const onTrace = (e: ToolTraceEntry) => {
    toolTrace.push(e);
  };

  const memorySearchQuery =
    phase === "initial" ? userMessage : resumeHumanText(resume!);
  const longTermMemoryBlock = await buildLongTermMemoryBlock(
    deps,
    context,
    memorySearchQuery,
  );

  const allTools: DynamicStructuredTool[] = [];

  for (const serverId of skill.mcpServerIds) {
    const client = await mcpPool.acquire(serverId);
    const tools = await discoverMcpTools(client, onTrace);
    allTools.push(...tools);
  }

  const agent = createReactAgent({
    llm,
    tools: allTools,
    prompt: buildSystemPrompt(skill, context, longTermMemoryBlock),
    checkpointer,
  });

  const messages =
    phase === "initial"
      ? [new HumanMessage(userMessage)]
      : [new HumanMessage(resumeHumanText(resume!))];

  const result = await agent.invoke(
    { messages },
    {
      configurable: { thread_id: threadId },
      recursionLimit: 64,
    },
  );

  const outMessages = result.messages as BaseMessage[];
  const resultText = lastAssistantText(outMessages);

  if (skill.hitl && phase === "initial") {
    return {
      status: "hitl_pending",
      resultText,
      messages: outMessages,
      messagesPreview: messagesPreview(outMessages),
      toolTrace,
    };
  }

  await maybePersistLongTermMemory(
    deps,
    context,
    memorySearchQuery,
    resultText,
  );

  return {
    status: "completed",
    resultText,
    messages: outMessages,
    messagesPreview: messagesPreview(outMessages),
    toolTrace,
  };
}

async function maybePersistLongTermMemory(
  deps: SkillRuntimeDeps,
  context: Record<string, unknown>,
  userTurnForMemory: string,
  resultText: string | undefined,
): Promise<void> {
  if (!deps.longTermMemory || !resultText?.trim()) return;
  const uid = context.mem0UserId;
  if (typeof uid !== "string" || !uid.trim()) return;
  const vertical =
    typeof context.memoryVertical === "string" && context.memoryVertical.trim()
      ? context.memoryVertical.trim()
      : "hiring";
  const scenarioId =
    typeof context.scenarioId === "string" && context.scenarioId.trim()
      ? context.scenarioId.trim()
      : undefined;
  const userTurn =
    userTurnForMemory.trim() ||
    "(empty user turn — e.g. HITL resume with decision only)";
  try {
    await deps.longTermMemory.add(
      [
        { role: "user", content: userTurn },
        { role: "assistant", content: resultText.trim() },
      ],
      {
        userId: uid.trim(),
        metadata: {
          vertical,
          ...(scenarioId ? { scenarioId } : {}),
        },
      },
    );
  } catch {
    /* best-effort persistence */
  }
}
