import type { LongTermMemoryMessage } from "@agent-harness/contracts";
import { SHARED_DEPT_ARCHITECTURE_ENTITY_ID } from "../identity.js";

export type SeedConversation = {
  entityId: string;
  messages: LongTermMemoryMessage[];
  metadata?: Record<string, unknown>;
};

/**
 * Demo seed for the shared department namespace: Maya (EA), Jordan (SA), Riley (TA);
 * Project Nexus (platform) and Project Aurora (onboarding). Loaded at API startup with `infer: false`.
 */
export const DEMO_SEED_CONVERSATIONS: SeedConversation[] = [
  {
    entityId: SHARED_DEPT_ARCHITECTURE_ENTITY_ID,
    metadata: {
      vertical: "architecture",
      seed: true,
      projects: ["nexus", "aurora"],
    },
    messages: [
      {
        role: "user",
        content:
          "Maya Chen (Enterprise Architect): We run two programs under one architecture board. Give me canonical one-liners for exec readouts — Project Nexus vs Project Aurora.",
      },
      {
        role: "assistant",
        content:
          "Nexus: consolidate integration and identity onto a governed platform with phased migration. Aurora: deliver a compliant customer onboarding capability with solution options and vendor gates.",
      },
      {
        role: "user",
        content:
          "Maya: Who owns delivery PM for Nexus and Aurora respectively?",
      },
      {
        role: "assistant",
        content:
          "Nexus program PM: Priya Nair (priya.nair@techcorp.example). Aurora program PM: Sam Okada (sam.okada@techcorp.example).",
      },
      {
        role: "user",
        content:
          "Maya: Where should engineering anchor the implementation stack for Nexus services?",
      },
      {
        role: "assistant",
        content:
          "Target stack for Nexus services: Node.js (APIs), React (internal ops consoles), AWS (ECS, RDS, Cognito) — aligned with the technical architecture track.",
      },
      {
        role: "user",
        content:
          "Jordan Okonkwo (Solution Architect): I'm leading solution-option development for Project Aurora — KYC-lite, document capture, CRM handoff; audit trail and ap-southeast-2 residency. Produce a solution-option template.",
      },
      {
        role: "assistant",
        content:
          "Template outline: scope, NFRs (residency ap-southeast-2), compliance/audit trail, risks, decisions — ready to iterate.",
      },
      {
        role: "user",
        content:
          "Jordan: Add vendor selection as an explicit pending decision with criteria: support SLAs, integration effort, local presence.",
      },
      {
        role: "assistant",
        content:
          "Updated: Vendor selection is pending with criteria — support SLAs, integration effort, local presence.",
      },
      {
        role: "user",
        content:
          "Riley Park (Technical Architect): Confirm Nexus reference stack and PM for delivery sequencing.",
      },
      {
        role: "assistant",
        content:
          "Reference stack: Node.js services, React internal UIs, AWS (ECS, RDS, Cognito). Nexus PM for sequencing: Priya Nair (priya.nair@techcorp.example).",
      },
      {
        role: "user",
        content:
          "Riley: I'm defining Nexus integration patterns (eventing vs sync API). Jordan owns Aurora UX flows; my current focus is Nexus delivery and platform patterns.",
      },
      {
        role: "assistant",
        content:
          "Noted: Riley’s current focus is Nexus delivery and integration/platform patterns; Aurora solution work stays with Jordan’s track.",
      },
      {
        role: "user",
        content:
          "Maya Chen: For the board slide — what is Jordan focused on right now in terms of program work?",
      },
      {
        role: "assistant",
        content:
          "Jordan Okonkwo (Solution Architect) is driving Project Aurora solution-option development (template iterations) and vendor evaluation; vendor selection is pending with SLA, integration effort, and local presence criteria. Aurora PM is Sam Okada (sam.okada@techcorp.example).",
      },
    ],
  },
];
