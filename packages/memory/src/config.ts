import { mkdirSync } from "node:fs";
import { join } from "node:path";
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

function defaultHistoryDbPath(): string {
  const dir = join(process.cwd(), ".mem0");
  try {
    mkdirSync(dir, { recursive: true });
  } catch {
    /* Mem0 may create parent dirs */
  }
  return join(dir, "memory-history.db");
}

/**
 * Builds Mem0 OSS config: gateway LLM (OpenAI-compatible) + Ollama embedder,
 * in-process vector store, optional Neo4j graph, SQLite history.
 */
export function buildMemoryConfigFromEnv(): Partial<MemoryConfig> {
  const ollamaUrl = envString("OLLAMA_URL", "http://127.0.0.1:11434");
  const embedModel = envString(
    "MEM0_EMBED_MODEL",
    envString("MEM0_OLLAMA_EMBED_MODEL", "nomic-embed-text:latest"),
  );
  const collectionName = envString("MEM0_VECTOR_COLLECTION", "harness-memories");
  const embeddingDims = Number(process.env.MEM0_EMBEDDING_DIMS ?? "768") || 768;

  const historyDbPath = envString("MEM0_HISTORY_DB_PATH", defaultHistoryDbPath());

  const llmProvider = envString("MEM0_LLM_PROVIDER", "openai").toLowerCase();

  const llmModelGateway = envString(
    "MEM0_LLM_MODEL",
    envString(
      "MEM0_OLLAMA_LLM_MODEL",
      envString("LLM_MODEL", "gpt-4o-mini"),
    ),
  );
  const llmModelOllama = envString(
    "MEM0_LLM_MODEL",
    envString("MEM0_OLLAMA_LLM_MODEL", "llama3.1:8b"),
  );

  const llmBlock =
    llmProvider === "ollama"
      ? {
          provider: "ollama" as const,
          config: {
            model: llmModelOllama,
            url: ollamaUrl,
            temperature: 0.1,
          },
        }
      : {
          provider: "openai" as const,
          config: {
            baseURL: envString(
              "MEM0_LLM_BASE_URL",
              envString("LLM_ENDPOINT", "https://api.openai.com/v1"),
            ),
            apiKey: envString("MEM0_LLM_API_KEY", process.env.LLM_API_KEY ?? ""),
            model: llmModelGateway,
            temperature: 0.1,
          },
        };

  const neo4jUrl = process.env.NEO4J_URL?.trim();
  const graphExplicit = process.env.MEM0_GRAPH_ENABLED;
  const enableGraph =
    graphExplicit === "true" ||
    (graphExplicit !== "false" && Boolean(neo4jUrl));

  const base: Partial<MemoryConfig> = {
    version: "v1.1",
    disableHistory: false,
    historyStore: {
      provider: "sqlite",
      config: {
        historyDbPath,
      },
    },
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
    llm: llmBlock as MemoryConfig["llm"],
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
