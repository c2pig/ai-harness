import type { OrchestrationState, OrchestrationMcpSkill, SkillContext } from "@agent-harness/adapters-mock";

export const fetchScenarioSignalsSkill: OrchestrationMcpSkill = {
  id: "fetchScenarioSignals",
  async run(state: OrchestrationState, ctx: SkillContext): Promise<OrchestrationState> {
    ctx.logger.debug("Skill run", {
      skill: "fetchScenarioSignals",
      scenarioId: state.context.scenarioId,
    });
    const signals = await ctx.mcp.getScenarioSignals(state.context.scenarioId);
    const evidence = { ...state.evidence };
    const provenance = { ...state.provenance };

    if (signals.marketDataBenchmarks) {
      evidence.marketDataBenchmarks = signals.marketDataBenchmarks;
      provenance.marketDataBenchmarks =
        "scenarioSignalsMcp.getScenarioSignals.marketDataBenchmarks";
    }

    if (signals.additionalCandidatesToCrossSell) {
      evidence.additionalCandidatesToCrossSell =
        signals.additionalCandidatesToCrossSell;
      provenance.additionalCandidatesToCrossSell =
        "scenarioSignalsMcp.getScenarioSignals.additionalCandidatesToCrossSell";
    }

    return { ...state, evidence, provenance };
  },
};
