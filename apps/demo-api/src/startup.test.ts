import { describe, expect, it, vi } from "vitest";

describe("demo-api startup", () => {
  it("createApp rejects when LLM_API_KEY is missing", async () => {
    const prev = process.env.LLM_API_KEY;
    vi.resetModules();
    delete process.env.LLM_API_KEY;
    const { createApp } = await import("./createApp.js");
    await expect(createApp()).rejects.toThrow(/LLM_API_KEY/);
    if (prev === undefined) delete process.env.LLM_API_KEY;
    else process.env.LLM_API_KEY = prev;
    vi.resetModules();
  });
});
