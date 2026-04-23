import createDebug from "debug";

export const logLlm = createDebug("harness:llm");
export const logEmbedding = createDebug("harness:embedding");
export const logGraph = createDebug("harness:graph");
export const logMem0 = createDebug("harness:mem0");

/** Truncate long strings for debug output (default 200 chars). */
export function truncate(str: string, max = 200): string {
  if (str.length <= max) return str;
  return `${str.slice(0, max)}… (${str.length} chars)`;
}
