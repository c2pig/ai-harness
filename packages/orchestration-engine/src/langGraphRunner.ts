import { Annotation, END, START, StateGraph } from "@langchain/langgraph";

export interface PipelineSkill {
  id: string;
  run: (
    state: Record<string, unknown>,
    ctx: PipelineContext,
  ) => Promise<Record<string, unknown>>;
}

export interface PipelineContext {
  logger: {
    info: (m: string, e?: Record<string, unknown>) => void;
    error: (m: string, e?: Record<string, unknown>) => void;
    debug: (m: string, e?: Record<string, unknown>) => void;
  };
}

const GraphState = Annotation.Root({
  orchestration: Annotation<Record<string, unknown>>({
    reducer: (_left, right) => right,
  }),
});

export class LangGraphRunner {
  private readonly skillMap: Map<string, PipelineSkill>;
  private readonly ctx: PipelineContext;

  constructor(skills: PipelineSkill[], ctx: PipelineContext) {
    this.skillMap = new Map(skills.map((s) => [s.id, s]));
    this.ctx = ctx;
  }

  async runPipeline(
    initialState: Record<string, unknown>,
    pipeline: string[],
  ): Promise<Record<string, unknown>> {
    const graph: any = new StateGraph(GraphState);

    for (const step of pipeline) {
      graph.addNode(step, async (state: typeof GraphState.State) => {
        const skill = this.skillMap.get(step);
        if (!skill) {
          throw new Error(`Missing skill implementation: ${step}`);
        }
        const start = Date.now();
        this.ctx.logger.info("LangGraph node start", {
          node: step,
        });
        try {
          const nextOrchestration = await skill.run(state.orchestration, this.ctx);
          this.ctx.logger.info("LangGraph node complete", {
            node: step,
            durationMs: Date.now() - start,
          });
          return { orchestration: nextOrchestration };
        } catch (error) {
          this.ctx.logger.error("LangGraph node failed", {
            node: step,
            durationMs: Date.now() - start,
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      });
    }

    if (pipeline.length === 0) {
      return initialState;
    }

    graph.addEdge(START, pipeline[0]);
    for (let i = 0; i < pipeline.length - 1; i += 1) {
      graph.addEdge(pipeline[i], pipeline[i + 1]);
    }
    graph.addEdge(pipeline[pipeline.length - 1], END);

    const app = graph.compile();
    const result = await app.invoke({ orchestration: initialState });
    return result.orchestration;
  }
}
