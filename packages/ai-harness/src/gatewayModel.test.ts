import { afterEach, describe, expect, it } from "vitest";
import { createMandatoryChatModel } from "./gatewayModel.js";

describe("createMandatoryChatModel", () => {
  const prev = process.env.LLM_API_KEY;

  afterEach(() => {
    if (prev === undefined) delete process.env.LLM_API_KEY;
    else process.env.LLM_API_KEY = prev;
  });

  it("throws when LLM_API_KEY is empty", () => {
    process.env.LLM_API_KEY = "";
    expect(() => createMandatoryChatModel()).toThrow(/LLM_API_KEY/);
  });

  it("throws when LLM_API_KEY is whitespace", () => {
    process.env.LLM_API_KEY = "   ";
    expect(() => createMandatoryChatModel()).toThrow(/LLM_API_KEY/);
  });

  it("clears topP so top_p is omitted (Bedrock rejects temperature + top_p together)", () => {
    process.env.LLM_API_KEY = "test-key";
    const model = createMandatoryChatModel();
    const params = model.invocationParams();
    expect(params.temperature).toBe(0.2);
    expect(params.top_p).toBeUndefined();
  });
});
