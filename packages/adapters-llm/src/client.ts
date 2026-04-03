import OpenAI from "openai";

export interface GatewayClientOptions {
  baseURL: string;
  apiKey: string;
  defaultModel?: string;
}

export function createGatewayClient(options: GatewayClientOptions): OpenAI {
  return new OpenAI({
    baseURL: options.baseURL.replace(/\/$/, ""),
    apiKey: options.apiKey,
  });
}

export function getGatewayEnv(): { baseURL: string; apiKey: string; model: string } {
  const baseURL =
    process.env.LLM_ENDPOINT ?? "https://api.openai.com/v1";
  const apiKey = process.env.LLM_API_KEY ?? "";
  const model = process.env.LLM_MODEL ?? "gpt-4o-mini";
  return { baseURL, apiKey, model };
}
