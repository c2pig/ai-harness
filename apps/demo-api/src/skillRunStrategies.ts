/**
 * Per-skill hooks for building agent context on POST /runs.
 * Strategy is selected from SKILL.md `context-strategy` (see parseSkillMd).
 */

import type { LoadedSkill } from "@agent-harness/skill-loader";
import {
  getContactFixture,
  SCENARIO_CONTRACTS,
} from "@agent-harness/adapters-mock";
import type { ScenarioId } from "@agent-harness/adapters-mock";

export type RunContextStrategy = {
  mergeFromInput(
    input: string,
    explicit: Record<string, unknown> | undefined,
  ): Record<string, unknown> | undefined;
  enrichContext(ctx: Record<string, unknown> | undefined): Record<string, unknown>;
};

function resolveScenarioId(hint: unknown, recommended?: ScenarioId): ScenarioId {
  if (typeof hint === "string" && hint in SCENARIO_CONTRACTS) {
    return hint as ScenarioId;
  }
  if (recommended) return recommended;
  return "S3_HIRER_NOT_RESPONDED_OR_REVIEWED";
}

/** PoC heuristics: pull fixture IDs from free text (explicit context wins on merge). */
export function parseHirerIdsFromInput(input: string): Record<string, number> {
  const out: Record<string, number> = {};
  const text = input.trim();

  const candidateMatch =
    text.match(/\bcandidate(?:\s+id)?\s*[:\s#]+\s*(\d{3,})\b/i) ??
    text.match(/\bcandidate\s+(\d{3,})\b/i);
  if (candidateMatch) {
    out.candidateId = Number(candidateMatch[1]);
  }

  const jobIdLabel = text.match(/\bjobId\s*[:\s#]+\s*(\d+)\b/i);
  if (jobIdLabel) {
    out.jobId = Number(jobIdLabel[1]);
  } else {
    const jobMatch =
      text.match(/\bjob(?:\s+id)?\s*[:\s#]+\s*(\d+)\b/i) ??
      text.match(/\bfor\s+job\s+(\d+)\b/i) ??
      text.match(/\bapply(?:ing)?\s+for\s+job\s+(\d+)\b/i);
    if (jobMatch) {
      out.jobId = Number(jobMatch[1]);
    }
  }

  const matchIdLabel = text.match(/\bmatchId\s*[:\s#]+\s*(\d+)\b/i);
  if (matchIdLabel) {
    out.matchId = Number(matchIdLabel[1]);
  } else {
    const matchMatch = text.match(/\bmatch(?:\s+id)?\s*[:\s#]+\s*(\d+)\b/i);
    if (matchMatch) {
      out.matchId = Number(matchMatch[1]);
    }
  }

  const partyIdLabel = text.match(/\bpartyId\s*[:\s#]+\s*(\d+)\b/i);
  if (partyIdLabel) {
    out.hirerId = Number(partyIdLabel[1]);
  }

  const hirerIdLabel = text.match(/\bhirerId\s*[:\s#]+\s*(\d+)\b/i);
  if (hirerIdLabel) {
    out.hirerId = Number(hirerIdLabel[1]);
  } else if (!out.hirerId) {
    const hirerMatch = text.match(/\bhirer(?:\s+id)?\s*[:\s#]+\s*(\d+)\b/i);
    if (hirerMatch) {
      out.hirerId = Number(hirerMatch[1]);
    }
  }

  return out;
}

const defaultRunContextStrategy: RunContextStrategy = {
  mergeFromInput: (_input, explicit) => explicit,
  enrichContext: (ctx) => ({ ...(ctx ?? {}) }),
};

const fixtureEnrichmentStrategy: RunContextStrategy = {
  mergeFromInput: (input, explicit) => {
    const parsed = parseHirerIdsFromInput(input);
    return { ...parsed, ...(explicit ?? {}) };
  },
  enrichContext: (ctx) => {
    const base = { ...(ctx ?? {}) };
    const raw = base.candidateId;
    const num =
      typeof raw === "number"
        ? raw
        : typeof raw === "string"
          ? Number(raw)
          : NaN;
    if (!Number.isFinite(num)) return base;

    const fixture = getContactFixture(num);
    const scenarioId = resolveScenarioId(base.scenarioHint, fixture?.recommendedScenarioId);
    const jobId = base.jobId ?? fixture?.defaultJobId;
    const matchId = base.matchId ?? fixture?.defaultMatchId;
    const hirerRaw = base.hirerId;
    const hirerId =
      typeof hirerRaw === "number"
        ? hirerRaw
        : typeof hirerRaw === "string"
          ? Number(hirerRaw)
          : undefined;
    const languagePreference =
      typeof base.languagePreference === "string" ? base.languagePreference : undefined;

    const scenarioContext = {
      scenarioId,
      jobId,
      matchId,
      ...(hirerId !== undefined && Number.isFinite(hirerId) ? { hirerId } : {}),
      candidateId: num,
      ...(languagePreference ? { languagePreference } : {}),
    };

    const orchestrationSeed = {
      context: scenarioContext,
      evidence: {},
      provenance: {},
      missingRequired: [] as string[],
      missingOptional: [] as string[],
      confidence: 0,
    };

    return {
      ...base,
      candidateId: num,
      scenarioId,
      jobId,
      matchId,
      orchestrationSeed,
    };
  },
};

const strategiesByName = new Map<string, RunContextStrategy>([
  ["fixture-enrichment", fixtureEnrichmentStrategy],
]);

export function runContextStrategyFor(skill: LoadedSkill): RunContextStrategy {
  const key = skill.contextStrategy?.trim();
  if (key && strategiesByName.has(key)) {
    return strategiesByName.get(key)!;
  }
  return defaultRunContextStrategy;
}

export function mergeRunContextFromInput(
  skill: LoadedSkill,
  input: string,
  explicit: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  return runContextStrategyFor(skill).mergeFromInput(input, explicit);
}

export function enrichRunContext(
  skill: LoadedSkill,
  ctx: Record<string, unknown> | undefined,
): Record<string, unknown> {
  return runContextStrategyFor(skill).enrichContext(ctx);
}
