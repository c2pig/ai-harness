import type OpenAI from "openai";
import { z } from "zod";

export interface LlmInvokeMeta {
  modelId: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
}

/**
 * Chat completion with JSON-in-message parsing + Zod + one retry; returns fallback on total failure.
 */
export async function completeJsonWithFallback<T>(
  client: OpenAI,
  params: {
    model: string;
    system: string;
    user: string;
    schema: z.ZodType<T>;
    fallback: T;
    temperature?: number;
    maxTokens?: number;
  },
): Promise<{
  value: T;
  meta: LlmInvokeMeta;
  source: "llm" | "fallback";
  lastAssistantText?: string;
}> {
  const start = Date.now();
  const temperature = params.temperature ?? 0.3;
  const maxTokens = params.maxTokens ?? 1024;
  let lastAssistantText: string | undefined;

  const tryParse = (text: string): T | null => {
    const trimmed = text.trim();
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    const raw = jsonMatch ? jsonMatch[0] : trimmed;
    try {
      const parsed = JSON.parse(raw) as unknown;
      const r = params.schema.safeParse(parsed);
      return r.success ? r.data : null;
    } catch {
      return null;
    }
  };

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: params.system },
    {
      role: "user",
      content: `${params.user}\n\nRespond with a single JSON object only, no markdown.`,
    },
  ];

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await client.chat.completions.create({
        model: params.model,
        messages,
        temperature,
        max_tokens: maxTokens,
      });
      const text = res.choices[0]?.message?.content ?? "";
      lastAssistantText = text;
      const parsed = tryParse(text);
      const usage = res.usage;
      const meta: LlmInvokeMeta = {
        modelId: params.model,
        latencyMs: Date.now() - start,
        inputTokens: usage?.prompt_tokens,
        outputTokens: usage?.completion_tokens,
      };
      if (parsed !== null) {
        return { value: parsed, meta, source: "llm", lastAssistantText: text };
      }
      if (attempt === 0) {
        messages.push({ role: "assistant", content: text });
        messages.push({
          role: "user",
          content: "Your last reply was not valid JSON for the schema. Output only valid JSON.",
        });
      }
    } catch {
      break;
    }
  }

  return {
    value: params.fallback,
    meta: {
      modelId: params.model,
      latencyMs: Date.now() - start,
    },
    source: "fallback",
    lastAssistantText,
  };
}
