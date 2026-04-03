import type { CanonicalPayload, RunResult } from "./payload.js";
import type { InputField, ScenarioId } from "./scenarios.js";

export interface JobSummary {
  title: string | null;
  mustHaveRequirements: string[];
  salaryRange: string | null;
  location: string | null;
}

export interface ScenarioContext {
  scenarioId: ScenarioId;
  jobId: number;
  matchId?: number;
  hirerId?: number;
  candidateId?: number;
  languagePreference?: string;
}

export interface EvidenceBundle {
  assistantDraftKeyPoints?: string[];
  scenarioType?: string;
  candidateCvHighlights?: string[];
  additionalCandidatesToCrossSell?: string[];
  jobDescriptionSummary?: JobSummary;
  languagePreference?: string;
  rejectionReasons?: string[];
  bestCandidateHighlights?: string[];
  rootCause?: string;
  marketDataBenchmarks?: string[];
  interviewFeedback?: string;
  nextBestCandidateHighlights?: string[];
}

export interface OrchestrationState {
  context: ScenarioContext;
  evidence: EvidenceBundle;
  provenance: Record<string, string>;
  missingRequired: InputField[];
  missingOptional: InputField[];
  confidence: number;
  canonicalPayload?: CanonicalPayload;
  variants?: RunResult["variants"];
}

export interface SkillContext {
  api: {
    getJobSummary: (jobId: number) => Promise<JobSummary | null>;
    getCandidateSignals: (matchId?: number) => Promise<{
      cvHighlights?: string[];
      bestCandidates?: string[];
      nextBestCandidates?: string[];
      interviewFeedback?: string;
      rejectionReasons?: string[];
      rootCause?: string;
    }>;
  };
  mcp: {
    getScenarioSignals: (scenarioId: ScenarioId) => Promise<{
      marketDataBenchmarks?: string[];
      additionalCandidatesToCrossSell?: string[];
    }>;
  };
  logger: {
    info: (message: string, extra?: Record<string, unknown>) => void;
    error: (message: string, extra?: Record<string, unknown>) => void;
    debug: (message: string, extra?: Record<string, unknown>) => void;
  };
}

/** MCP tool handler contract for multi-step orchestration demos. */
export interface OrchestrationMcpSkill {
  id: string;
  run: (state: OrchestrationState, ctx: SkillContext) => Promise<OrchestrationState>;
}
