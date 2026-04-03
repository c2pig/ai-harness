import type { JobSummary } from "./scenarioContextTypes.js";
import type { AdapterLogger } from "./logger.js";
import { loadFixtureJson } from "./loadFixtureJson.js";

type CandidateSignalRecord = {
  cvHighlights?: string[];
  bestCandidates?: string[];
  nextBestCandidates?: string[];
  interviewFeedback?: string;
  rejectionReasons?: string[];
  rootCause?: string;
};

const candidateSignals = loadFixtureJson<Record<string, CandidateSignalRecord>>(
  "candidateSignals.json",
);
const jobSummaries = loadFixtureJson<Record<string, JobSummary>>("jobSummaries.json");

export class FixtureRecordsApiMock {
  constructor(private readonly logger?: AdapterLogger) {}

  async getJobSummary(jobId: number): Promise<JobSummary | null> {
    this.logger?.debug("Adapter call: getJobSummary", {
      tool: "fixtureRecordsApi",
      jobId,
    });
    const row = (jobSummaries as Record<string, JobSummary>)[String(jobId)];
    this.logger?.debug("Adapter result: getJobSummary", {
      tool: "fixtureRecordsApi",
      found: !!row,
    });
    return row ?? null;
  }

  async getCandidateSignals(matchId?: number): Promise<CandidateSignalRecord> {
    this.logger?.debug("Adapter call: getCandidateSignals", {
      tool: "fixtureRecordsApi",
      matchId: matchId ?? null,
    });
    if (!matchId) {
      return {};
    }
    const result = candidateSignals[String(matchId)] ?? {};
    this.logger?.debug("Adapter result: getCandidateSignals", {
      tool: "fixtureRecordsApi",
      found: Object.keys(result).length > 0,
    });
    return result;
  }
}
