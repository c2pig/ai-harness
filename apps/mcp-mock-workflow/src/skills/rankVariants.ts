import type { PromptVariant } from "@agent-harness/adapters-mock";
import type { OrchestrationState, OrchestrationMcpSkill, SkillContext } from "@agent-harness/adapters-mock";

function rankScore(baseConfidence: number, modifier: number): number {
  return Math.max(0, Math.min(1, Number((baseConfidence * modifier).toFixed(2))));
}

function buildKeyPoints(state: OrchestrationState): string[] {
  if (
    state.evidence.assistantDraftKeyPoints &&
    state.evidence.assistantDraftKeyPoints.length > 0
  ) {
    return state.evidence.assistantDraftKeyPoints;
  }

  const toPreview = (value: unknown): string => {
    if (Array.isArray(value)) {
      return value.slice(0, 2).map((item) => String(item)).join("; ");
    }
    if (value && typeof value === "object") {
      return JSON.stringify(value);
    }
    return String(value);
  };

  return Object.entries(state.evidence)
    .filter(([k]) => k !== "assistantDraftKeyPoints")
    .filter(([, value]) => value !== undefined && value !== null)
    .slice(0, 4)
    .map(([k, v]) => `${k}: ${toPreview(v)}`);
}

export const rankVariantsSkill: OrchestrationMcpSkill = {
  id: "rankVariants",
  async run(state: OrchestrationState, ctx: SkillContext): Promise<OrchestrationState> {
    const keyPoints = buildKeyPoints(state);

    const variants: PromptVariant[] = [
      {
        rank: 1,
        score: rankScore(state.confidence, 1),
        rationale: "Highest confidence, balanced detail and actionability.",
        payload: {
          style: "consultative",
          messageGoal: "Keep hirer engaged and move next hiring step forward.",
          keyPoints,
        },
      },
      {
        rank: 2,
        score: rankScore(state.confidence, 0.94),
        rationale: "More direct wording with concise evidence points.",
        payload: {
          style: "direct",
          messageGoal: "Prompt a quick hirer response with minimal friction.",
          keyPoints,
        },
      },
      {
        rank: 3,
        score: rankScore(state.confidence, 0.89),
        rationale: "Data-led framing with benchmark and context emphasis.",
        payload: {
          style: "data-led",
          messageGoal: "Use factual support to justify recommendations.",
          keyPoints,
        },
      },
    ];

    ctx.logger.info("Variants ranked", {
      skill: "rankVariants",
      scenarioId: state.context.scenarioId,
      variantScores: variants.map((v) => v.score),
    });

    return {
      ...state,
      variants,
    };
  },
};
