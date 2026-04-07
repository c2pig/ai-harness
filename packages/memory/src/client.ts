import type {
  LongTermMemoryClient,
  LongTermMemoryMessage,
  LongTermMemorySearchResult,
} from "@agent-harness/contracts";
import { Memory, type Message } from "mem0ai/oss";
import { buildMemoryConfigFromEnv } from "./config.js";

function toMem0Messages(messages: LongTermMemoryMessage[]): Message[] {
  return messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
}

export class Mem0LongTermMemoryClient implements LongTermMemoryClient {
  constructor(private readonly memory: Memory) {}

  async search(
    query: string,
    options: { userId: string; limit?: number },
  ): Promise<LongTermMemorySearchResult> {
    const raw = await this.memory.search(query, {
      userId: options.userId,
      limit: options.limit ?? 8,
    });
    const results = (raw.results ?? []).map((item) => ({
      memory: item.memory,
    }));
    return { results };
  }

  async add(
    messages: LongTermMemoryMessage[],
    options: { userId: string; metadata?: Record<string, unknown> },
  ): Promise<void> {
    await this.memory.add(toMem0Messages(messages), {
      userId: options.userId,
      metadata: options.metadata,
    });
  }
}

export function wrapMem0Memory(memory: Memory): LongTermMemoryClient {
  return new Mem0LongTermMemoryClient(memory);
}

export async function createLongTermMemoryClient(): Promise<LongTermMemoryClient> {
  const memory = new Memory(buildMemoryConfigFromEnv());
  return wrapMem0Memory(memory);
}
