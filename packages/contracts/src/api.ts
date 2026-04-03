import { z } from "zod";

export const postRunRequestSchema = z.object({
  skillName: z.string().min(1).optional(),
  /** Primary user prompt for the skill agent */
  input: z.string().min(1),
  /** Optional structured context (e.g. candidateId, hirerId) passed to the agent system prompt */
  context: z.record(z.unknown()).optional(),
  /** Continue the same LangGraph checkpoint / conversation (equals runId from a prior response) */
  threadId: z.string().uuid().optional(),
});

export type PostRunRequest = z.infer<typeof postRunRequestSchema>;

export const resumeRunBodySchema = z.object({
  decision: z.enum(["approve", "reject", "edit"]),
  correctionText: z.string().optional(),
  resumeToken: z.string().optional(),
});

export type ResumeRunBody = z.infer<typeof resumeRunBodySchema>;

export type RunStatus =
  | "running"
  | "hitl_pending"
  | "completed"
  | "failed"
  | "expired";

export interface TraceStep {
  id: string;
  skillName?: string;
  startedAt: string;
  completedAt?: string;
  detail?: string;
}

export interface ToolTraceEntry {
  name: string;
  argsDigest?: string;
  resultPreview?: string;
  durationMs?: number;
  error?: string;
}

/** Structured payload stored on RunSnapshot.result (discriminated by phase). */
export type SkillRunResult =
  | {
      phase: "proposal";
      agentContext: Record<string, unknown>;
      proposalText?: string;
      messagesPreview?: unknown[];
    }
  | {
      phase: "completed";
      agentContext: Record<string, unknown>;
      finalText?: string;
      decision?: string;
      correctionText?: string;
      proposalText?: string;
      messagesPreview?: unknown[];
    };

/**
 * Persisted run state for the generic harness (LangGraph thread + UI).
 */
export interface RunSnapshot {
  runId: string;
  workflowId: string;
  status: RunStatus;
  skillName: string;
  result?: SkillRunResult;
  hitlPendingSince?: string;
  trace: TraceStep[];
  error?: string;
  /** LangGraph MemorySaver thread id (usually same as runId) */
  threadId?: string;
  /** Serialized messages at HITL boundary for UI preview */
  messagesPreview?: unknown[];
  toolTrace?: ToolTraceEntry[];
  emailMockPayload?: {
    to: string;
    subject: string;
    bodyPreview: string;
  };
}
