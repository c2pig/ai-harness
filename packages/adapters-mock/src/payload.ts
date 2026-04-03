import { z } from "zod";
import type { InputField, ScenarioId } from "./scenarios.js";

export const promptVariantSchema = z.object({
  rank: z.number().int().min(1).max(3),
  score: z.number().min(0).max(1),
  rationale: z.string(),
  payload: z.object({
    style: z.enum(["direct", "consultative", "data-led"]),
    messageGoal: z.string(),
    keyPoints: z.array(z.string()),
  }),
});

export type PromptVariant = z.infer<typeof promptVariantSchema>;

export const runResultSchema = z.object({
  scenarioId: z.string(),
  scenarioTitle: z.string(),
  canonicalPayload: z.object({
    scenario: z.string(),
    languagePreference: z.string(),
    jobDescriptionSummary: z.object({
      title: z.string().nullable(),
      mustHaveRequirements: z.array(z.string()),
      salaryRange: z.string().nullable(),
      location: z.string().nullable(),
    }),
    evidence: z.record(z.unknown()),
  }),
  variants: z.array(promptVariantSchema).length(3),
  missingRequired: z.array(z.string()),
  missingOptional: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  provenance: z.record(z.string()),
});

export interface CanonicalPayload {
  scenario: ScenarioId;
  languagePreference: string;
  jobDescriptionSummary: {
    title: string | null;
    mustHaveRequirements: string[];
    salaryRange: string | null;
    location: string | null;
  };
  evidence: Record<string, unknown>;
}

export interface RunResult {
  scenarioId: ScenarioId;
  scenarioTitle: string;
  canonicalPayload: CanonicalPayload;
  variants: PromptVariant[];
  missingRequired: InputField[];
  missingOptional: InputField[];
  confidence: number;
  provenance: Record<string, string>;
}
