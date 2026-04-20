import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const { mockRun, mockModel } = vi.hoisted(() => ({
  mockRun: vi.fn(),
  mockModel: vi.fn(() => ({})),
}));

vi.mock("@agent-harness/ai-harness", () => ({
  createMandatoryChatModel: mockModel,
  runSkillInvocation: mockRun,
  discoverMcpTools: vi.fn(),
  McpClientPool: class McpClientPool {
    async acquire() {
      return {};
    }
    async releaseAll() {
      return Promise.resolve();
    }
  },
}));

import { createApp } from "./createApp.js";

describe("demo-api", () => {
  let app: import("express").Express;

  beforeAll(async () => {
    process.env.LLM_API_KEY = process.env.LLM_API_KEY || "test-key";
    const created = await createApp();
    app = created.app;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockModel.mockReturnValue({} as never);
    mockRun.mockResolvedValue({
      status: "completed",
      resultText: "mocked completion",
      messages: [],
      messagesPreview: [],
      toolTrace: [],
    });
  });

  it("GET /health", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("GET /meta/catalogue lists sample skills", async () => {
    const res = await request(app).get("/meta/catalogue");
    expect(res.status).toBe(200);
    const names = (res.body.skills ?? []).map((s: { name: string }) => s.name);
    expect(names).toContain("evidence-gated-reply");
    expect(names).toContain("demo-echo");
    expect(names).toContain("job-interview-recruiter");
    expect(names).toContain("person-journey-analytics");
    expect(names).toContain("mortgage-planning-consult");
    expect(names).toContain("property-search-consult");
    expect(names).toHaveLength(10);
    expect(names).not.toContain("demo-summary");
  });

  it("POST /runs defaults skill to job-interview-recruiter when skillName omitted", async () => {
    const res = await request(app).post("/runs").send({
      input: "hello world",
    });
    expect(res.status).toBe(200);
    expect(mockRun.mock.calls[0]?.[0]?.skill?.id).toBe("job-interview-recruiter");
  });

  it("POST /runs job-interview-recruiter calls harness and echoes threadId", async () => {
    const res = await request(app).post("/runs").send({
      skillName: "job-interview-recruiter",
      input: "hello world",
    });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("completed");
    expect(res.body.threadId).toBe(res.body.runId);
    expect(mockRun).toHaveBeenCalled();
  });

  it("POST /runs continues same threadId and passes it to harness", async () => {
    mockRun
      .mockReset()
      .mockResolvedValueOnce({
        status: "completed",
        resultText: "first",
        messages: [],
        messagesPreview: [],
        toolTrace: [],
      })
      .mockResolvedValueOnce({
        status: "completed",
        resultText: "second",
        messages: [],
        messagesPreview: [],
        toolTrace: [],
      });

    const first = await request(app).post("/runs").send({
      skillName: "job-interview-recruiter",
      input: "one",
    });
    expect(first.status).toBe(200);
    const tid = first.body.threadId as string;

    const second = await request(app).post("/runs").send({
      skillName: "job-interview-recruiter",
      input: "two",
      threadId: tid,
    });
    expect(second.status).toBe(200);
    expect(second.body.runId).toBe(tid);
    expect(mockRun.mock.calls[1]?.[0]?.threadId).toBe(tid);
  });

  it("POST /runs returns 400 when threadId belongs to another skill", async () => {
    mockRun.mockResolvedValue({
      status: "completed",
      resultText: "ok",
      messages: [],
      messagesPreview: [],
      toolTrace: [],
    });

    const first = await request(app).post("/runs").send({
      skillName: "job-interview-recruiter",
      input: "x",
    });
    expect(first.status).toBe(200);
    const tid = first.body.runId as string;

    const second = await request(app).post("/runs").send({
      skillName: "evidence-gated-reply",
      input: "y",
      threadId: tid,
    });
    expect(second.status).toBe(400);
    expect(second.body.error).toMatch(/job-interview-recruiter/);
  });

  it("POST /runs then resume for HITL skill", async () => {
    mockRun
      .mockReset()
      .mockResolvedValueOnce({
        status: "hitl_pending",
        resultText: "proposal",
        messages: [],
        messagesPreview: [{ type: "ai", content: "proposal" }],
        toolTrace: [{ name: "database_query", durationMs: 2 }],
      })
      .mockResolvedValueOnce({
        status: "completed",
        resultText: "final",
        messages: [],
        messagesPreview: [],
        toolTrace: [],
      });

    const run = await request(app).post("/runs").send({
      skillName: "data-analysis",
      input: "show revenue by region",
    });
    expect(run.status).toBe(200);
    expect(run.body.status).toBe("hitl_pending");
    expect(run.body.threadId).toBe(run.body.runId);
    const runId = run.body.runId as string;

    const blocked = await request(app).post("/runs").send({
      skillName: "data-analysis",
      input: "follow-up while pending",
      threadId: runId,
    });
    expect(blocked.status).toBe(409);
    expect(blocked.body.error).toMatch(/resume/i);

    const resume = await request(app)
      .post(`/runs/${encodeURIComponent(runId)}/resume`)
      .send({ decision: "approve" });
    expect(resume.status).toBe(200);
    expect(resume.body.status).toBe("completed");
  });
});
