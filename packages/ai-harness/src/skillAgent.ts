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

function buildSystemPrompt(skill: LoadedSkill, context: Record<string, unknown>): string {
  const ctxBlock =
    context && Object.keys(context).length > 0
      ? `\n\n## Context (JSON)\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\`\n`
      : "";
  return `${skill.body.trim()}${ctxBlock}`;
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

  const allTools: DynamicStructuredTool[] = [];

  for (const serverId of skill.mcpServerIds) {
    const client = await mcpPool.acquire(serverId);
    const tools = await discoverMcpTools(client, onTrace);
    allTools.push(...tools);
  }

  const agent = createReactAgent({
    llm,
    tools: allTools,
    prompt: buildSystemPrompt(skill, context),
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

  return {
    status: "completed",
    resultText,
    messages: outMessages,
    messagesPreview: messagesPreview(outMessages),
    toolTrace,
  };
}
