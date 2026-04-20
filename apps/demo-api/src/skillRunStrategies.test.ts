import { afterEach, describe, expect, it, vi } from "vitest";
import type { LoadedSkill } from "@agent-harness/skill-loader";
import {
  enrichRunContext,
  mergeRunContextFromInput,
  parseHirerIdsFromInput,
} from "./skillRunStrategies.js";

function minimalSkill(
  overrides: Partial<LoadedSkill> & Pick<LoadedSkill, "id">,
): LoadedSkill {
  const { id, ...rest } = overrides;
  return {
    catalogueRoot: "/tmp",
    frontmatter: { name: id, description: "x" },
    body: "",
    mcpServerIds: [],
    hitl: false,
    id,
    ...rest,
  };
}

describe("parseHirerIdsFromInput", () => {
  it("parses candidate and job from natural language", () => {
    const t =
      "i want to know the candidate 5001 apply for job 101, draft the reply to hirer";
    expect(parseHirerIdsFromInput(t)).toEqual({
      candidateId: 5001,
      jobId: 101,
    });
  });

  it("parses labeled ids", () => {
    const t = "candidate id: 5002, jobId: 202, matchId: 9002, hirerId: 100";
    expect(parseHirerIdsFromInput(t)).toEqual({
      candidateId: 5002,
      jobId: 202,
      matchId: 9002,
      hirerId: 100,
    });
  });

  it("returns empty when no ids", () => {
    expect(parseHirerIdsFromInput("hello")).toEqual({});
  });
});

describe("mergeRunContextFromInput", () => {
  it("returns explicit unchanged for default strategy", () => {
    expect(
      mergeRunContextFromInput(minimalSkill({ id: "no-strategy-skill" }), "candidate 5001", {
        x: 1,
      }),
    ).toEqual({ x: 1 });
  });

  it("explicit overrides parsed for fixture-enrichment strategy", () => {
    const merged = mergeRunContextFromInput(
      minimalSkill({
        id: "evidence-gated-reply",
        contextStrategy: "fixture-enrichment",
        memoryEntityDomain: "legacy",
      }),
      "candidate 5001 job 101",
      { candidateId: 9999 },
    );
    expect(merged?.candidateId).toBe(9999);
    expect(merged?.jobId).toBe(101);
  });
});

describe("enrichRunContext", () => {
  it("passes through for default skills", () => {
    expect(
      enrichRunContext(minimalSkill({ id: "no-strategy-skill" }), { a: 1 }),
    ).toEqual({
      a: 1,
    });
    expect(enrichRunContext(minimalSkill({ id: "no-strategy-skill" }), undefined)).toEqual(
      {},
    );
  });

  it("adds orchestration seed for fixture-enrichment when candidateId resolves to fixture", () => {
    const out = enrichRunContext(
      minimalSkill({
        id: "evidence-gated-reply",
        contextStrategy: "fixture-enrichment",
        memoryEntityDomain: "legacy",
      }),
      { candidateId: 5001 },
    );
    expect(out.candidateId).toBe(5001);
    expect(out.scenarioId).toBeDefined();
    expect(out.jobId).toBeDefined();
    expect(out.matchId).toBeDefined();
    const seed = out.orchestrationSeed as { context: Record<string, unknown> };
    expect(seed?.context?.scenarioId).toBe(out.scenarioId);
  });

  it("fixture-enrichment leaves context unchanged without parsable candidateId", () => {
    expect(
      enrichRunContext(
        minimalSkill({
          id: "evidence-gated-reply",
          contextStrategy: "fixture-enrichment",
          memoryEntityDomain: "legacy",
        }),
        { foo: "bar" },
      ),
    ).toEqual({
      foo: "bar",
    });
  });

  it("adds entityId when MEMORY_ENABLED is true and candidate maps to a fixture (legacy domain)", () => {
    vi.stubEnv("MEMORY_ENABLED", "true");
    const out = enrichRunContext(
      minimalSkill({
        id: "evidence-gated-reply",
        contextStrategy: "fixture-enrichment",
        memoryEntityDomain: "legacy",
      }),
      { candidateId: 5001 },
    );
    expect(out.entityId).toBe("user-5001-legacy");
    expect(out.memoryVertical).toBe("hiring");
  });

  it("adds entityId with journey suffix when skill declares journey domain", () => {
    vi.stubEnv("MEMORY_ENABLED", "true");
    const out = enrichRunContext(
      minimalSkill({
        id: "job-interview-recruiter",
        contextStrategy: "fixture-enrichment",
        memoryEntityDomain: "journey",
      }),
      { candidateId: 5001 },
    );
    expect(out.entityId).toBe("user-5001-journey");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });
});
