import { describe, expect, it, vi } from "vitest";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { discoverMcpTools } from "./mcpToolAdapter.js";

describe("discoverMcpTools", () => {
  it("creates tools that call MCP and record trace", async () => {
    const traces: { name: string }[] = [];
    const client = {
      listTools: vi.fn().mockResolvedValue({
        tools: [
          {
            name: "web_search",
            description: "search",
            inputSchema: {
              type: "object",
              properties: { query: { type: "string" } },
              required: ["query"],
            },
          },
        ],
      }),
      callTool: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: '{"ok":true}' }],
      }),
    } as unknown as Client;

    const tools = await discoverMcpTools(client, (e) => traces.push({ name: e.name }));
    expect(tools).toHaveLength(1);
    const text = await tools[0].invoke({ query: "x" });
    expect(text).toContain("ok");
    expect(client.callTool).toHaveBeenCalledWith({
      name: "web_search",
      arguments: { query: "x" },
    });
    expect(traces).toEqual([{ name: "web_search" }]);
  });
});
