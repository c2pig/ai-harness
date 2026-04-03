import { SCENARIO_CONTRACTS } from "@agent-harness/adapters-mock";
import type { InputField } from "@agent-harness/adapters-mock";
import type { OrchestrationState, OrchestrationMcpSkill, SkillContext } from "@agent-harness/adapters-mock";

const INPUT_FIELDS = new Set<string>([
  "scenarioType",
  "candidateCvHighlights",
  "additionalCandidatesToCrossSell",
  "jobDescriptionSummary",
  "languagePreference",
  "rejectionReasons",
  "bestCandidateHighlights",
  "rootCause",
  "marketDataBenchmarks",
  "interviewFeedback",
  "nextBestCandidateHighlights",
]);

function presentFields(state: OrchestrationState): Set<InputField> {
  const present = new Set<InputField>();
  const entries = Object.entries(state.evidence);
  for (const [field, value] of entries) {
    if (!INPUT_FIELDS.has(field)) continue;
    if (value === undefined || value === null) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    present.add(field as InputField);
  }
  return present;
}

export const detectGapsSkill: OrchestrationMcpSkill = {
  id: "detectGaps",
  async run(state: OrchestrationState, ctx: SkillContext): Promise<OrchestrationState> {
    const contract = SCENARIO_CONTRACTS[state.context.scenarioId];
    const present = presentFields(state);

    const missingRequired = contract.required.filter((f) => !present.has(f));
    const missingOptional = contract.optional.filter((f) => !present.has(f));

    const requiredCoverage =
      contract.required.length === 0
        ? 1
        : (contract.required.length - missingRequired.length) /
          contract.required.length;
    const optionalCoverage =
      contract.optional.length === 0
        ? 1
        : (contract.optional.length - missingOptional.length) /
          contract.optional.length;

    const confidence = Number(
      (requiredCoverage * 0.75 + optionalCoverage * 0.25).toFixed(2),
    );

    ctx.logger.info("Gap detection completed", {
      skill: "detectGaps",
      scenarioId: state.context.scenarioId,
      missingRequired,
      missingOptionalCount: missingOptional.length,
      confidence,
    });

    return {
      ...state,
      missingRequired,
      missingOptional,
      confidence,
    };
  },
};
