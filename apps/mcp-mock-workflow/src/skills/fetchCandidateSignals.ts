import type { OrchestrationState, OrchestrationMcpSkill, SkillContext } from "@agent-harness/adapters-mock";
import type { ScenarioId } from "@agent-harness/adapters-mock";

function applyScenarioShape(
  scenarioId: ScenarioId,
  state: OrchestrationState,
  raw: Awaited<ReturnType<SkillContext["api"]["getCandidateSignals"]>>,
): OrchestrationState {
  const evidence = { ...state.evidence };
  const provenance = { ...state.provenance };

  if (raw.cvHighlights) {
    evidence.candidateCvHighlights = raw.cvHighlights;
    provenance.candidateCvHighlights =
      "fixtureRecordsApi.getCandidateSignals.cvHighlights";
  }
  if (raw.rejectionReasons) {
    evidence.rejectionReasons = raw.rejectionReasons;
    provenance.rejectionReasons =
      "fixtureRecordsApi.getCandidateSignals.rejectionReasons";
  }
  if (raw.interviewFeedback) {
    evidence.interviewFeedback = raw.interviewFeedback;
    provenance.interviewFeedback =
      "fixtureRecordsApi.getCandidateSignals.interviewFeedback";
  }
  if (raw.rootCause) {
    evidence.rootCause = raw.rootCause;
    provenance.rootCause = "fixtureRecordsApi.getCandidateSignals.rootCause";
  }

  if (scenarioId === "S3_HIRER_NOT_RESPONDED_OR_REVIEWED" && raw.bestCandidates) {
    evidence.bestCandidateHighlights = raw.bestCandidates;
    provenance.bestCandidateHighlights =
      "fixtureRecordsApi.getCandidateSignals.bestCandidates";
  }
  if (
    scenarioId === "S7_INTERVIEW_DID_NOT_GO_WELL_WITH_OTHERS" &&
    raw.nextBestCandidates
  ) {
    evidence.nextBestCandidateHighlights = raw.nextBestCandidates;
    provenance.nextBestCandidateHighlights =
      "fixtureRecordsApi.getCandidateSignals.nextBestCandidates";
  }

  return { ...state, evidence, provenance };
}

export const fetchCandidateSignalsSkill: OrchestrationMcpSkill = {
  id: "fetchCandidateSignals",
  async run(state: OrchestrationState, ctx: SkillContext): Promise<OrchestrationState> {
    ctx.logger.debug("Skill run", {
      skill: "fetchCandidateSignals",
      matchId: state.context.matchId ?? null,
    });
    const raw = await ctx.api.getCandidateSignals(state.context.matchId);
    return applyScenarioShape(state.context.scenarioId, state, raw);
  },
};
