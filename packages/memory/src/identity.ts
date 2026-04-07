/** Maps fixture contact IDs (candidateContexts.json) to stable Mem0 user_id values. */

const CONTACT_TO_USER_ID: Record<number, string> = {
  5001: "user-5001",
  5002: "user-5002",
  5003: "user-5003",
};

export function resolveUserId(contactId: number): string | undefined {
  return CONTACT_TO_USER_ID[contactId];
}
