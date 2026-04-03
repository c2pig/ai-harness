import type { HarnessRunStatus, ToolTraceEntry } from "@agent-harness/contracts";
import {
  buildHarnessStructuredRecord,
  emitHarnessLog,
  type BuildHarnessRecordInput,
  type CloudWatchLogSink,
  type LoggerLike,
} from "@agent-harness/observability";

export function createHarnessLogger(
  component: string,
  logger: LoggerLike,
  cwSink: CloudWatchLogSink | null,
) {
  return {
    async emit(
      input: Omit<BuildHarnessRecordInput, "component">,
    ): Promise<void> {
      await emitHarnessLog(
        logger,
        buildHarnessStructuredRecord({ component, ...input }),
        cwSink,
      );
    },

    async emitToolTrace(
      runId: string,
      workflowId: string,
      skillName: string,
      trace: ToolTraceEntry[],
    ): Promise<void> {
      for (const te of trace) {
        await this.emit({
          event: "tool_invoked",
          runId,
          workflowId,
          runStatus: "running" as HarnessRunStatus,
          skillName,
          toolName: te.name,
          toolArgsDigest: te.argsDigest,
          durationMs: te.durationMs,
          error: te.error,
        });
      }
    },
  };
}

export type HarnessLogger = ReturnType<typeof createHarnessLogger>;
