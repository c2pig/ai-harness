import type { CanonicalPayload } from "@agent-harness/adapters-mock";
import type { OrchestrationState, OrchestrationMcpSkill, SkillContext } from "@agent-harness/adapters-mock";

export const compilePayloadSkill: OrchestrationMcpSkill = {
  id: "compilePayload",
  async run(state: OrchestrationState, ctx: SkillContext): Promise<OrchestrationState> {
    const canonicalPayload: CanonicalPayload = {
      scenario: state.context.scenarioId,
      languagePreference:
        state.evidence.languagePreference ??
        state.context.languagePreference ??
        "English",
      jobDescriptionSummary: state.evidence.jobDescriptionSummary ?? {
        title: null,
        mustHaveRequirements: [],
        salaryRange: null,
        location: null,
      },
      evidence: {
        ...state.evidence,
      },
    };

    ctx.logger.debug("Payload compiled", {
      skill: "compilePayload",
      scenarioId: state.context.scenarioId,
      evidenceKeys: Object.keys(canonicalPayload.evidence),
    });

    return {
      ...state,
      canonicalPayload,
    };
  },
};
