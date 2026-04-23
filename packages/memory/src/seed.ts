import type { LongTermMemoryClient } from "@agent-harness/contracts";
import { DEMO_SEED_CONVERSATIONS } from "./seed-data/demoSeeds.js";

/**
 * Loads demo cross-domain memories via Mem0 (`infer: false`: embed per message, no LLM extraction).
 */
export async function seedDemoData(client: LongTermMemoryClient): Promise<void> {
  const seeds = DEMO_SEED_CONVERSATIONS;
  const n = seeds.length;
  const enableInfer = false;
  for (let i = 0; i < n; i++) {
    const conv = seeds[i];
    console.log(
      `[memory] Seeding demo ${i + 1}/${n} (entityId=${conv.entityId}; infer=false → embed per message, no LLM)…`,
    );
    await client.add(conv.messages, {
      entityId: conv.entityId,
      metadata: conv.metadata,
      infer: enableInfer,
    });
  }
  console.log("[memory] Demo seed finished.");
}
