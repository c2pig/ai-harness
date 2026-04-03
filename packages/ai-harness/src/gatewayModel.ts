import { ChatOpenAI } from "@langchain/openai";
import { getGatewayEnv } from "@agent-harness/adapters-llm";

/**
 * Build a ChatOpenAI for the configured OpenAI-compatible endpoint. Throws if the API key is missing.
 *
 * LangChain's ChatOpenAI defaults `topP` to 1 and always includes `top_p` in completion
 * params alongside `temperature`. LiteLLM → Bedrock (Anthropic) rejects requests that
 * send both. We clear `topP` after construction so `top_p` is omitted from the HTTP body
 * (OpenAI SDK drops undefined fields).
 */
export function createMandatoryChatModel(): ChatOpenAI {
  const env = getGatewayEnv();
  if (!env.apiKey.trim()) {
    throw new Error("LLM_API_KEY is required and must be non-empty");
  }
  const model = new ChatOpenAI({
    model: env.model,
    apiKey: env.apiKey,
    configuration: {
      baseURL: env.baseURL.replace(/\/$/, ""),
    },
    temperature: 0.2,
  });
  // Constructor ignores `topP: undefined` (nullish coalescing falls back to default 1).
  // @ts-expect-error LangChain types topP as number; undefined omits top_p from the request body.
  model.topP = undefined;
  return model;
}
