import type { MemoryConfig } from "mem0ai/oss";

function envString(name: string, fallback: string): string {
  const v = process.env[name];
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function envBool(name: string, defaultValue: boolean): boolean {
  const v = process.env[name];
  if (v === undefined || v === "") return defaultValue;
  return v === "1" || v.toLowerCase() === "true" || v === "yes";
}

/**
 * Builds Mem0 OSS config: Ollama LLM + embedder, in-process vector store, optional Neo4j graph.
 */
export function buildMemoryConfigFromEnv(): Partial<MemoryConfig> {
  const ollamaUrl = envString("OLLAMA_URL", "http://127.0.0.1:11434");
  const embedModel = envString("MEM0_OLLAMA_EMBED_MODEL", "nomic-embed-text:latest");
  const llmModel = envString("MEM0_OLLAMA_LLM_MODEL", "llama3.1:8b");
  const collectionName = envString("MEM0_VECTOR_COLLECTION", "harness-memories");
  const embeddingDims = Number(process.env.MEM0_EMBEDDING_DIMS ?? "768") || 768;

  const neo4jUrl = process.env.NEO4J_URL?.trim();
  const graphExplicit = process.env.MEM0_GRAPH_ENABLED;
  const enableGraph =
    graphExplicit === "true" ||
    (graphExplicit !== "false" && Boolean(neo4jUrl));

  const base: Partial<MemoryConfig> = {
    version: "v1.1",
    disableHistory: true,
    embedder: {
      provider: "ollama",
      config: {
        model: embedModel,
        url: ollamaUrl,
        embeddingDims,
      },
    },
    vectorStore: {
      provider: "memory",
      config: {
        collectionName,
        dimension: embeddingDims,
      },
    },
    llm: {
      provider: "ollama",
      config: {
        model: llmModel,
        url: ollamaUrl,
        temperature: 0.1,
      } as Record<string, unknown>,
    },
  };

  if (enableGraph && neo4jUrl) {
    return {
      ...base,
      enableGraph: true,
      graphStore: {
        provider: "neo4j",
        config: {
          url: neo4jUrl,
          username: envString("NEO4J_USERNAME", "neo4j"),
          password: envString("NEO4J_PASSWORD", "password"),
        },
      },
    };
  }

  return {
    ...base,
    enableGraph: envBool("MEM0_GRAPH_ENABLED", false),
  };
}
