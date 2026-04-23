import type {
  LongTermMemoryClient,
  LongTermMemoryGraphTriple,
  LongTermMemoryMessage,
  LongTermMemorySearchResult,
} from "@agent-harness/contracts";
import type { MemoryConfig } from "mem0ai/oss";
import { Memory, type Message } from "mem0ai/oss";
import { buildMemoryConfigFromEnv } from "./config.js";
import { logEmbedding, logGraph, logLlm, logMem0, truncate } from "./debug.js";

function toMem0Messages(messages: LongTermMemoryMessage[]): Message[] {
  return messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
}

/** Runtime shape of mem0ai Memory internals (not exported; we patch for DEBUG). */
type Mem0PatchTarget = {
  llm: {
    generateResponse: (
      messages: unknown,
      responseFormat?: unknown,
      tools?: unknown,
    ) => Promise<unknown>;
  };
  embedder: {
    embed: (text: unknown) => Promise<unknown>;
    embedBatch?: (texts: unknown) => Promise<unknown>;
  };
  graphMemory?: {
    add: (...args: unknown[]) => Promise<unknown>;
    search: (...args: unknown[]) => Promise<unknown>;
  };
};

/**
 * Wraps Mem0's llm / embedder / graphMemory so DEBUG=harness:llm|embedding|graph
 * logs each call without forking mem0ai.
 */
function instrumentMem0InternalDebug(memory: Memory): void {
  const m = memory as unknown as Mem0PatchTarget;

  const llmGen = m.llm.generateResponse.bind(m.llm);
  m.llm.generateResponse = async (
    messages: unknown,
    responseFormat?: unknown,
    tools?: unknown,
  ) => {
    const t0 = Date.now();
    const msgs = Array.isArray(messages) ? messages : [];
    const first = msgs[0] as { role?: string; content?: string } | undefined;
    logLlm(
      "request messages=%d firstRole=%s firstContent=%s response_format=%o",
      msgs.length,
      first?.role ?? "?",
      truncate(String(first?.content ?? ""), 200),
      responseFormat,
    );
    try {
      const out = await llmGen(messages, responseFormat, tools);
      const elapsed = Date.now() - t0;
      const outStr =
        typeof out === "string" ? out : JSON.stringify(out as object);
      logLlm("response (%dms) %s", elapsed, truncate(outStr, 200));
      return out;
    } catch (err) {
      logLlm(
        "error (%dms) %s",
        Date.now() - t0,
        err instanceof Error ? err.message : String(err),
      );
      throw err;
    }
  };

  const embedOne = m.embedder.embed.bind(m.embedder);
  m.embedder.embed = async (text: unknown) => {
    const t0 = Date.now();
    const input = typeof text === "string" ? text : JSON.stringify(text);
    logEmbedding("embed input %s", truncate(input, 120));
    const vec = await embedOne(text);
    const dim = Array.isArray(vec) ? vec.length : 0;
    logEmbedding("embed done (%dms) dim=%d", Date.now() - t0, dim);
    return vec;
  };

  if (typeof m.embedder.embedBatch === "function") {
    const batchOrig = m.embedder.embedBatch.bind(m.embedder);
    m.embedder.embedBatch = async (texts: unknown) => {
      const t0 = Date.now();
      const arr = Array.isArray(texts) ? texts : [];
      logEmbedding(
        "embedBatch count=%d first=%s",
        arr.length,
        arr[0] !== undefined ? truncate(String(arr[0]), 80) : "(empty)",
      );
      const out = await batchOrig(texts);
      const n = Array.isArray(out) ? out.length : 0;
      logEmbedding("embedBatch done (%dms) results=%d", Date.now() - t0, n);
      return out;
    };
  }

  if (m.graphMemory) {
    const g = m.graphMemory;
    const addOrig = g.add.bind(g);
    g.add = async (...args: unknown[]) => {
      const t0 = Date.now();
      const data = args[0];
      logGraph("add input %s", truncate(String(data ?? ""), 200));
      const res = (await addOrig(...args)) as { relations?: unknown[] };
      const n = Array.isArray(res?.relations) ? res.relations.length : 0;
      logGraph("add done (%dms) relations count=%d", Date.now() - t0, n);
      return res;
    };
    const searchOrig = g.search.bind(g);
    g.search = async (...args: unknown[]) => {
      const t0 = Date.now();
      logGraph(
        "search query %s (args=%d)",
        truncate(String(args[0] ?? ""), 200),
        args.length,
      );
      const res = await searchOrig(...args);
      const relen = Array.isArray(res) ? res.length : 0;
      logGraph("search done (%dms) rows=%d", Date.now() - t0, relen);
      return res;
    };
  }
}

function logMem0ConfigSummary(config: Partial<MemoryConfig>): void {
  const llm = config.llm;
  const llmProv = String(llm?.provider ?? "openai");
  const llmCfg = llm?.config as Record<string, unknown> | undefined;
  const embed = config.embedder?.config as Record<string, unknown> | undefined;
  const hist = config.historyStore?.config as
    | { historyDbPath?: string }
    | undefined;
  logMem0(
    "config llm=%s model=%s embedder=%s/%s graph=%s historyDb=%s disableHistory=%s",
    llmProv,
    String(llmCfg?.model ?? ""),
    String(config.embedder?.provider ?? ""),
    String(embed?.model ?? ""),
    config.enableGraph ? "on" : "off",
    hist?.historyDbPath ?? "(default)",
    String(config.disableHistory ?? false),
  );
}

export class Mem0LongTermMemoryClient implements LongTermMemoryClient {
  constructor(private readonly memory: Memory) {}

  async search(
    query: string,
    options: { entityId: string; limit?: number },
  ): Promise<LongTermMemorySearchResult> {
    const limit = options.limit ?? 8;
    const t0 = Date.now();
    logMem0(
      "search start query=%s entityId=%s limit=%d",
      truncate(query, 120),
      options.entityId,
      limit,
    );
    const raw = await this.memory.search(query, {
      userId: options.entityId,
      limit,
    });
    const results = (raw.results ?? []).map((item) => ({
      memory: item.memory,
    }));
    const rels = raw.relations;
    let relations: LongTermMemoryGraphTriple[] | undefined;
    if (Array.isArray(rels) && rels.length > 0) {
      relations = rels.map((r) => ({
        source: String(r.source),
        relationship: String(r.relationship),
        destination: String(r.destination),
      }));
    }
    logMem0(
      "search done (%dms) vectorHits=%d relations=%d",
      Date.now() - t0,
      results.length,
      relations?.length ?? 0,
    );
    return relations?.length ? { results, relations } : { results };
  }

  async add(
    messages: LongTermMemoryMessage[],
    options: {
      entityId: string;
      metadata?: Record<string, unknown>;
      infer?: boolean;
    },
  ): Promise<void> {
    const infer = options.infer ?? true;
    const label = infer ? "infer=true (LLM + embed)" : "infer=false (embed only)";
    console.log(
      `[memory] Mem0.add start (${label}, ${messages.length} messages, entityId=${options.entityId})…`,
    );
    const t0 = Date.now();
    logMem0(
      "add start infer=%s messages=%d entityId=%s",
      String(infer),
      messages.length,
      options.entityId,
    );
    await this.memory.add(toMem0Messages(messages), {
      userId: options.entityId,
      metadata: options.metadata,
      infer,
    });
    const sec = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`[memory] Mem0.add done in ${sec}s`);
    logMem0("add done in %s s", sec);
  }
}

export function wrapMem0Memory(memory: Memory): LongTermMemoryClient {
  return new Mem0LongTermMemoryClient(memory);
}

export async function createLongTermMemoryClient(): Promise<LongTermMemoryClient> {
  const config = buildMemoryConfigFromEnv();
  logMem0ConfigSummary(config);
  const embedCfg = config.embedder?.config as { url?: string } | undefined;
  const llmProv = String(config.llm?.provider ?? "openai");
  const llmCfg = config.llm?.config as Record<string, unknown> | undefined;
  if (llmProv === "ollama") {
    console.log(
      `[memory] Mem0: LLM ollama url=${llmCfg?.url ?? "(default)"} model=${String(llmCfg?.model ?? "")}`,
    );
  } else {
    console.log(
      `[memory] Mem0: LLM ${llmProv} baseURL=${String(llmCfg?.baseURL ?? llmCfg?.baseUrl ?? "")} model=${String(llmCfg?.model ?? "")}`,
    );
  }
  console.log(
    `[memory] Mem0: embedder ollama ${embedCfg?.url ?? "(default)"}, graph ${config.enableGraph ? "on" : "off"}`,
  );
  console.log(
    "[memory] Constructing Mem0 Memory instance (embed probe may call Ollama)…",
  );
  logMem0("constructing Memory instance…");
  const memory = new Memory(config);
  instrumentMem0InternalDebug(memory);
  console.log("[memory] Mem0 client constructed.");
  logMem0("client constructed (internal llm/embedder/graph hooks installed)");
  return wrapMem0Memory(memory);
}
