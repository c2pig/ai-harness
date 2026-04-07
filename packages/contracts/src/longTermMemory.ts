/**
 * Minimal contract for long-term memory used by @agent-harness/ai-harness.
 * Implemented by @agent-harness/memory (Mem0) or mocks in tests.
 */

export type LongTermMemoryMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type LongTermMemorySearchHit = {
  memory: string;
};

export type LongTermMemorySearchResult = {
  results: LongTermMemorySearchHit[];
};

export interface LongTermMemoryClient {
  search(
    query: string,
    options: { userId: string; limit?: number },
  ): Promise<LongTermMemorySearchResult>;

  add(
    messages: LongTermMemoryMessage[],
    options: { userId: string; metadata?: Record<string, unknown> },
  ): Promise<void>;
}
