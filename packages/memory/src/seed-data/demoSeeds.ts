import type { LongTermMemoryMessage } from "@agent-harness/contracts";

export type SeedConversation = {
  userId: string;
  messages: LongTermMemoryMessage[];
  metadata?: Record<string, unknown>;
};

/**
 * Deterministic demo memories aligned with adapters-mock candidateContexts 5001–5003.
 * Hiring facts mirror recommendedScenarioId; property facts are fictional cross-domain story.
 */
export const DEMO_SEED_CONVERSATIONS: SeedConversation[] = [
  {
    userId: "user-5001",
    metadata: { contactId: 5001, vertical: "cross_domain", seed: true },
    messages: [
      {
        role: "user",
        content:
          "Record hiring context: Contact 5001 (Ada Chen) — scenario S1 hirer liked at least one candidate; strong alignment with senior backend role at job 101.",
      },
      {
        role: "assistant",
        content:
          "Saved. Ada Chen is a favored candidate for the backend role; hirer feedback is positive.",
      },
      {
        role: "user",
        content:
          "Record property context: Ada Chen is a first home buyer under contract on 12 Harbor View; settlement targeted for May 2026.",
      },
      {
        role: "assistant",
        content:
          "Saved. Ada Chen has an active property purchase as a first-time buyer.",
      },
    ],
  },
  {
    userId: "user-5002",
    metadata: { contactId: 5002, vertical: "cross_domain", seed: true },
    messages: [
      {
        role: "user",
        content:
          "Record hiring context: Contact 5002 (Ben Okoro) — scenario S4 no suitable CVs in 10+ days; job 202; supply gap in market.",
      },
      {
        role: "assistant",
        content:
          "Saved. Ben Okoro's pipeline reflects a thin market for the role requirements.",
      },
      {
        role: "user",
        content:
          "Record property context: Ben Okoro is also pre-approved for a mortgage and viewing units in the CBD.",
      },
      {
        role: "assistant",
        content:
          "Saved. Ben Okoro is actively searching for a city apartment with financing in place.",
      },
    ],
  },
  {
    userId: "user-5003",
    metadata: { contactId: 5003, vertical: "cross_domain", seed: true },
    messages: [
      {
        role: "user",
        content:
          "Record hiring context: Contact 5003 (Carol Diaz) — scenario S5 interview went well for job 303; strong culture fit signal.",
      },
      {
        role: "assistant",
        content: "Saved. Carol Diaz had a successful interview round with positive panel notes.",
      },
      {
        role: "user",
        content:
          "Record property context: Carol Diaz is selling an investment property while recruiting for a new role.",
      },
      {
        role: "assistant",
        content:
          "Saved. Carol Diaz is managing a property sale in parallel with her job search.",
      },
    ],
  },
];
