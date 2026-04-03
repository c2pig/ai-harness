export type HarnessRunStatus =
  | "running"
  | "hitl_pending"
  | "completed"
  | "failed"
  | "expired";

export type HarnessEvent =
  | "run_started"
  | "skill_step_started"
  | "skill_step_completed"
  | "tool_invoked"
  | "llm_invocation"
  | "hitl_opened"
  | "hitl_resumed"
  | "run_completed"
  | "run_failed"
  | "run_expired"
  | "side_effect_mock_email"
  | "workflow_selected";

export interface HarnessLlmTrace {
  modelId?: string;
  latencyMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  selectionSource?: "rules" | "llm" | "fallback";
}

export interface HarnessHitlState {
  state: "none" | "pending_approval" | "approved" | "rejected" | "edited";
  pendingSince?: string;
}

/**
 * Canonical structured log record for CloudWatch / Datadog (JSON one line).
 * Skills do not define this schema — platform only.
 */
export interface HarnessStructuredLogRecord {
  component: string;
  event: HarnessEvent | string;
  msg: string;
  environment: string;
  runId: string;
  workflowId: string;
  runStatus: HarnessRunStatus;
  skillName?: string;
  stepIndex?: number;
  planSkillNames?: string[];
  hitl?: HarnessHitlState;
  llmTrace?: HarnessLlmTrace;
  durationMs?: number;
  error?: string;
  toolName?: string;
  toolArgsDigest?: string;
  [key: string]: unknown;
}
