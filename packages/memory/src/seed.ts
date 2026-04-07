import type { LongTermMemoryClient } from "@agent-harness/contracts";
import { DEMO_SEED_CONVERSATIONS } from "./seed-data/demoSeeds.js";

/**
 * Loads demo cross-domain memories via Mem0 (runs extraction LLM per conversation).
 */
export async function seedDemoData(client: LongTermMemoryClient): Promise<void> {
  for (const conv of DEMO_SEED_CONVERSATIONS) {
    await client.add(conv.messages, {
      userId: conv.userId,
      metadata: conv.metadata,
    });
  }
}
