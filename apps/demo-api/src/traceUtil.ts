import type { TraceStep } from "@agent-harness/contracts";

export function traceStep(
  id: string,
  detail: string,
  skillName?: string,
): TraceStep {
  const t = new Date().toISOString();
  return { id, startedAt: t, completedAt: t, detail, skillName };
}
