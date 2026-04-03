import type { OrchestrationState, OrchestrationMcpSkill, SkillContext } from "@agent-harness/adapters-mock";

export const fetchJobSummarySkill: OrchestrationMcpSkill = {
  id: "fetchJobSummary",
  async run(state: OrchestrationState, ctx: SkillContext): Promise<OrchestrationState> {
    ctx.logger.debug("Skill run", { skill: "fetchJobSummary", jobId: state.context.jobId });
    const summary = await ctx.api.getJobSummary(state.context.jobId);
    if (!summary) {
      ctx.logger.info("Job summary not found", { jobId: state.context.jobId });
      return state;
    }

    return {
      ...state,
      evidence: {
        ...state.evidence,
        jobDescriptionSummary: summary,
      },
      provenance: {
        ...state.provenance,
        jobDescriptionSummary: "fixtureRecordsApi.getJobSummary",
      },
    };
  },
};
