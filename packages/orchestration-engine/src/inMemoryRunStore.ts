import type { RunSnapshot } from "@agent-harness/contracts";

export class InMemoryRunStore {
  private readonly runs = new Map<string, RunSnapshot>();

  get(runId: string): RunSnapshot | undefined {
    return this.runs.get(runId);
  }

  save(snapshot: RunSnapshot): void {
    this.runs.set(snapshot.runId, { ...snapshot, runId: snapshot.runId });
  }
}
