import type {
  HarnessEvent,
  HarnessRunStatus,
  HarnessStructuredLogRecord,
} from "@agent-harness/contracts";

export interface BuildHarnessRecordInput {
  component: string;
  event: HarnessEvent | string;
  runId: string;
  workflowId: string;
  runStatus: HarnessRunStatus;
  environment?: string;
  skillName?: string;
  stepIndex?: number;
  planSkillNames?: string[];
  hitl?: HarnessStructuredLogRecord["hitl"];
  llmTrace?: HarnessStructuredLogRecord["llmTrace"];
  durationMs?: number;
  error?: string;
  toolName?: string;
  toolArgsDigest?: string;
  extra?: Record<string, unknown>;
}

export function buildHarnessStructuredRecord(
  input: BuildHarnessRecordInput,
): HarnessStructuredLogRecord {
  const environment = input.environment ?? process.env.NODE_ENV ?? "development";
  const msg = `[${input.component}] ${input.event} runId=${input.runId}`;

  return {
    component: input.component,
    event: input.event,
    msg,
    environment,
    runId: input.runId,
    workflowId: input.workflowId,
    runStatus: input.runStatus,
    ...(input.skillName !== undefined && { skillName: input.skillName }),
    ...(input.stepIndex !== undefined && { stepIndex: input.stepIndex }),
    ...(input.planSkillNames !== undefined && {
      planSkillNames: input.planSkillNames,
    }),
    ...(input.hitl !== undefined && { hitl: input.hitl }),
    ...(input.llmTrace !== undefined && { llmTrace: input.llmTrace }),
    ...(input.durationMs !== undefined && { durationMs: input.durationMs }),
    ...(input.error !== undefined && { error: input.error }),
    ...(input.toolName !== undefined && { toolName: input.toolName }),
    ...(input.toolArgsDigest !== undefined && {
      toolArgsDigest: input.toolArgsDigest,
    }),
    ...input.extra,
  };
}

export function harnessStructuredLogLine(
  record: HarnessStructuredLogRecord,
): string {
  return JSON.stringify(record);
}
