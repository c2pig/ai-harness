/**
 * Shared Mem0 namespace for the architecture-department “accumulate knowledge” PoC.
 * All seeded and live turns for `context-strategy: dept-memory` use this `entityId`.
 */
export const SHARED_DEPT_ARCHITECTURE_ENTITY_ID = "dept-architecture";

/** Maps fixture contact IDs (candidateContexts.json) to stable entity id prefixes. */

const CONTACT_TO_ENTITY_PREFIX: Record<number, string> = {
  5001: "user-5001",
  5002: "user-5002",
  5003: "user-5003",
};

/** Memory partition for Mem0 / Neo4j scoping: journey skills vs legacy hiring demos. */
export type MemoryEntityDomain = "journey" | "legacy";

/**
 * Builds the Mem0 `userId` filter value (harness: `entityId`) for fixture contacts.
 * Example: `buildFixtureEntityId(5001, "legacy")` → `user-5001-legacy`
 */
export function buildFixtureEntityId(
  contactId: number,
  domain: MemoryEntityDomain,
): string | undefined {
  const prefix = CONTACT_TO_ENTITY_PREFIX[contactId];
  if (!prefix) return undefined;
  return `${prefix}-${domain}`;
}
