import type { LongTermMemoryMessage } from "@agent-harness/contracts";

export type SeedConversation = {
  entityId: string;
  messages: LongTermMemoryMessage[];
  metadata?: Record<string, unknown>;
};

/**
 * Deterministic demo memories aligned with adapters-mock candidateContexts 5001–5003.
 * **Legacy** domain: original hiring + property cross-domain stubs (evidence-gated style).
 * **Journey** domain: multi-step persona for journey skills (recruiter / property / finance).
 */
export const DEMO_SEED_CONVERSATIONS: SeedConversation[] = [
  {
    entityId: "user-5001-legacy",
    metadata: {
      contactId: 5001,
      vertical: "cross_domain",
      seed: true,
      memoryEntityDomain: "legacy",
    },
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
    entityId: "user-5001-journey",
    metadata: {
      contactId: 5001,
      vertical: "journey",
      seed: true,
      memoryEntityDomain: "journey",
    },
    messages: [
      {
        role: "user",
        content:
          "Candidate 5001: I'm Ada Chen, targeting a senior backend role in Sydney; I want AUD 170–185k and can start after four weeks' notice.",
      },
      {
        role: "assistant",
        content:
          "Noted: senior backend, Sydney, salary band, four-week notice — saved for your journey profile.",
      },
      {
        role: "user",
        content:
          "We're also buying our first home in the inner west; budget up to 1.5M and settlement aimed for May 2026.",
      },
      {
        role: "assistant",
        content:
          "Recorded: first-home purchase, inner west, budget ceiling, May settlement timeline.",
      },
    ],
  },
  {
    entityId: "user-5002-legacy",
    metadata: {
      contactId: 5002,
      vertical: "cross_domain",
      seed: true,
      memoryEntityDomain: "legacy",
    },
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
    entityId: "user-5002-journey",
    metadata: {
      contactId: 5002,
      vertical: "journey",
      seed: true,
      memoryEntityDomain: "journey",
    },
    messages: [
      {
        role: "user",
        content:
          "Candidate 5002: Ben Okoro, data analyst — looking at Singapore roles around SGD 100–115k; mortgage pre-approval in place for a CBD apartment.",
      },
      {
        role: "assistant",
        content:
          "Captured: analyst track, Singapore salary range, financing pre-approved for CBD apartment search.",
      },
    ],
  },
  {
    entityId: "user-5003-legacy",
    metadata: {
      contactId: 5003,
      vertical: "cross_domain",
      seed: true,
      memoryEntityDomain: "legacy",
    },
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
  {
    entityId: "user-5003-journey",
    metadata: {
      contactId: 5003,
      vertical: "journey",
      seed: true,
      memoryEntityDomain: "journey",
    },
    messages: [
      {
        role: "user",
        content:
          "Candidate 5003: Carol Diaz balancing a job offer in marketing with selling an investment unit; wants clarity on deposit timing vs start date.",
      },
      {
        role: "assistant",
        content:
          "Noted: marketing offer, investment sale in flight, coordinating deposit and employment start — saved to journey memory.",
      },
    ],
  },
];
