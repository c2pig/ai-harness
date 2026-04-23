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

/** One graph edge (subject —relationship→ object) from Mem0 Neo4j search. */
export type LongTermMemoryGraphTriple = {
  source: string;
  relationship: string;
  destination: string;
};

export type LongTermMemorySearchResult = {
  results: LongTermMemorySearchHit[];
  /** Present when Mem0 graph (Neo4j) is enabled; BM25-ranked triples. */
  relations?: LongTermMemoryGraphTriple[];
};

export interface LongTermMemoryClient {
  search(
    query: string,
    options: { entityId: string; limit?: number },
  ): Promise<LongTermMemorySearchResult>;

  add(
    messages: LongTermMemoryMessage[],
    options: {
      entityId: string;
      metadata?: Record<string, unknown>;
      /**
       * When `true`, Mem0 runs LLM fact extraction (and graph when enabled).
       * Default `false`: embeddings only (no extraction).
       */
      infer?: boolean;
    },
  ): Promise<void>;
}
