export type ScenarioId =
  | "S1_HIRER_LIKED_AT_LEAST_ONE"
  | "S2_HIRER_REJECTED_ALL"
  | "S3_HIRER_NOT_RESPONDED_OR_REVIEWED"
  | "S4_NO_SUITABLE_CVS_10_DAYS"
  | "S5_INTERVIEW_WENT_WELL"
  | "S6_INTERVIEW_DID_NOT_GO_WELL_NO_OTHERS"
  | "S7_INTERVIEW_DID_NOT_GO_WELL_WITH_OTHERS";

export type InputField =
  | "scenarioType"
  | "candidateCvHighlights"
  | "additionalCandidatesToCrossSell"
  | "jobDescriptionSummary"
  | "languagePreference"
  | "rejectionReasons"
  | "bestCandidateHighlights"
  | "rootCause"
  | "marketDataBenchmarks"
  | "interviewFeedback"
  | "nextBestCandidateHighlights";

export interface ScenarioContract {
  id: ScenarioId;
  title: string;
  required: InputField[];
  optional: InputField[];
}

export const SCENARIO_CONTRACTS: Record<ScenarioId, ScenarioContract> = {
  S1_HIRER_LIKED_AT_LEAST_ONE: {
    id: "S1_HIRER_LIKED_AT_LEAST_ONE",
    title: "Hirer liked at least 1 candidate",
    required: ["scenarioType"],
    optional: [
      "candidateCvHighlights",
      "additionalCandidatesToCrossSell",
      "jobDescriptionSummary",
      "languagePreference",
    ],
  },
  S2_HIRER_REJECTED_ALL: {
    id: "S2_HIRER_REJECTED_ALL",
    title: "Hirer rejected all candidates",
    required: ["scenarioType"],
    optional: [
      "rejectionReasons",
      "candidateCvHighlights",
      "jobDescriptionSummary",
      "languagePreference",
    ],
  },
  S3_HIRER_NOT_RESPONDED_OR_REVIEWED: {
    id: "S3_HIRER_NOT_RESPONDED_OR_REVIEWED",
    title: "Hirer has not responded / reviewed candidates",
    required: ["scenarioType"],
    optional: [
      "bestCandidateHighlights",
      "jobDescriptionSummary",
      "languagePreference",
    ],
  },
  S4_NO_SUITABLE_CVS_10_DAYS: {
    id: "S4_NO_SUITABLE_CVS_10_DAYS",
    title: "No suitable CVs sent in 10+ days",
    required: ["scenarioType", "rootCause"],
    optional: [
      "jobDescriptionSummary",
      "marketDataBenchmarks",
      "languagePreference",
    ],
  },
  S5_INTERVIEW_WENT_WELL: {
    id: "S5_INTERVIEW_WENT_WELL",
    title: "Interview went well",
    required: ["scenarioType"],
    optional: [
      "candidateCvHighlights",
      "jobDescriptionSummary",
      "languagePreference",
    ],
  },
  S6_INTERVIEW_DID_NOT_GO_WELL_NO_OTHERS: {
    id: "S6_INTERVIEW_DID_NOT_GO_WELL_NO_OTHERS",
    title: "Interview did not go well (no other candidates)",
    required: ["scenarioType"],
    optional: [
      "candidateCvHighlights",
      "interviewFeedback",
      "jobDescriptionSummary",
      "languagePreference",
    ],
  },
  S7_INTERVIEW_DID_NOT_GO_WELL_WITH_OTHERS: {
    id: "S7_INTERVIEW_DID_NOT_GO_WELL_WITH_OTHERS",
    title: "Interview did not go well (other candidates available)",
    required: ["scenarioType"],
    optional: [
      "nextBestCandidateHighlights",
      "interviewFeedback",
      "jobDescriptionSummary",
      "languagePreference",
    ],
  },
};
