import type { ScenarioId } from "./scenarios.js";
import type { AdapterLogger } from "./logger.js";
import { loadFixtureJson } from "./loadFixtureJson.js";

type ScenarioSignalRecord = {
  marketDataBenchmarks?: string[];
  additionalCandidatesToCrossSell?: string[];
};

const scenarioSignals = loadFixtureJson<Record<string, ScenarioSignalRecord>>(
  "scenarioSignals.json",
);

export class ScenarioSignalsMcpMock {
  constructor(private readonly logger?: AdapterLogger) {}

  async getScenarioSignals(scenarioId: ScenarioId): Promise<ScenarioSignalRecord> {
    this.logger?.debug("Adapter call: getScenarioSignals", {
      tool: "scenarioSignalsMcp",
      scenarioId,
    });
    const result = scenarioSignals[scenarioId] ?? {};
    this.logger?.debug("Adapter result: getScenarioSignals", {
      tool: "scenarioSignalsMcp",
      keys: Object.keys(result),
    });
    return result;
  }
}
