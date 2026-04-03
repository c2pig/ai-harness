import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

function safeCalculate(expression: string): number {
  const trimmed = expression.trim();
  if (!/^[-+*/().\d\s]+$/.test(trimmed)) {
    throw new Error("Expression may only contain digits, spaces, and + - * / ( ).");
  }
  return Function(`"use strict"; return (${trimmed})`)() as number;
}

const mcpServer = new McpServer({
  name: "mcp-tools-generic",
  version: "0.1.0",
});

mcpServer.registerTool(
  "web_search",
  {
    description: "Mock web search — returns stub snippets for a query string.",
    inputSchema: z.object({ query: z.string() }),
  },
  async ({ query }) => ({
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          query,
          results: [
            {
              title: `Result for: ${query}`,
              url: "https://example.test/doc",
              snippet:
                "This is stubbed search data for the generic harness demo. Replace with a real search tool in production.",
            },
          ],
        }),
      },
    ],
  }),
);

mcpServer.registerTool(
  "database_query",
  {
    description:
      "Mock SQL query — ignores the SQL and returns a small fixed tabular result.",
    inputSchema: z.object({ sql: z.string() }),
  },
  async ({ sql }) => ({
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          sql,
          rows: [
            { id: 1, region: "AU", revenue: 12000 },
            { id: 2, region: "NZ", revenue: 8400 },
            { id: 3, region: "AU", revenue: 15300 },
          ],
        }),
      },
    ],
  }),
);

mcpServer.registerTool(
  "text_transform",
  {
    description:
      "Transform text: operation is one of uppercase, lowercase, summarize_stub.",
    inputSchema: z.object({
      text: z.string(),
      operation: z.enum(["uppercase", "lowercase", "summarize_stub"]),
    }),
  },
  async ({ text, operation }) => {
    let out: string;
    if (operation === "uppercase") out = text.toUpperCase();
    else if (operation === "lowercase") out = text.toLowerCase();
    else out = `[stub summary] ${text.slice(0, 120)}${text.length > 120 ? "…" : ""}`;
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ operation, result: out }) }],
    };
  },
);

mcpServer.registerTool(
  "calculate",
  {
    description: "Evaluate a simple arithmetic expression with + - * / and parentheses.",
    inputSchema: z.object({ expression: z.string() }),
  },
  async ({ expression }) => {
    const value = safeCalculate(expression);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ expression, value }),
        },
      ],
    };
  },
);

mcpServer.registerTool(
  "get_property_listing",
  {
    description: "Stub property listing by id — title, suburb, and a price band.",
    inputSchema: z.object({ listingId: z.string() }),
  },
  async ({ listingId }) => ({
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          listingId,
          title: `Demo listing ${listingId}`,
          suburb: "Riverside",
          priceBand: "$680k–$720k",
        }),
      },
    ],
  }),
);

mcpServer.registerTool(
  "classify_client_interest",
  {
    description:
      "Heuristic interest classifier from a short message excerpt (demo stub).",
    inputSchema: z.object({ messageExcerpt: z.string() }),
  },
  async ({ messageExcerpt }) => {
    const lower = messageExcerpt.toLowerCase();
    const positive =
      /\b(yes|yeah|interested|sounds good|keen|love it|book|viewing)\b/.test(lower);
    const negative =
      /\b(no|not interested|pass|maybe later|busy|stop)\b/.test(lower);
    const interested = positive && !negative;
    const confidence = interested ? 0.82 : negative ? 0.78 : 0.45;
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ interested, confidence }),
        },
      ],
    };
  },
);

mcpServer.registerTool(
  "save_client_qualification",
  {
    description: "Stub CRM save for budget, timeline, area preferences, notes.",
    inputSchema: z.object({
      budgetRange: z.string().optional(),
      timeline: z.string().optional(),
      preferences: z.string().optional(),
      notes: z.string().optional(),
    }),
  },
  async (fields) => {
    const leadRef = `lead-${Date.now().toString(36)}`;
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ saved: true, leadRef, captured: fields }),
        },
      ],
    };
  },
);

mcpServer.registerTool(
  "list_viewing_slots",
  {
    description: "Stub available viewing slots for a listing.",
    inputSchema: z.object({ listingId: z.string() }),
  },
  async ({ listingId }) => ({
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          listingId,
          slots: [
            "Sat 10:00",
            "Sat 14:30",
            "Sun 11:00",
            "Mon 17:45",
          ],
        }),
      },
    ],
  }),
);

mcpServer.registerTool(
  "record_viewing_request",
  {
    description: "Stub booking confirmation for a viewing slot.",
    inputSchema: z.object({
      listingId: z.string(),
      slot: z.string(),
      clientHint: z.string().optional(),
    }),
  },
  async ({ listingId, slot, clientHint }) => {
    const confirmationRef = `vw-${listingId}-${Date.now().toString(36)}`;
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ confirmationRef, listingId, slot, clientHint }),
        },
      ],
    };
  },
);

mcpServer.registerTool(
  "classify_support_issue",
  {
    description:
      "Stub triage: billing vs technical vs access from a free-text description.",
    inputSchema: z.object({ description: z.string() }),
  },
  async ({ description }) => {
    const d = description.toLowerCase();
    let category: "billing" | "technical" | "access" = "technical";
    if (/\b(bill|invoice|charge|payment|refund|subscription)\b/.test(d)) {
      category = "billing";
    } else if (/\b(login|password|mfa|2fa|locked out|access|permission)\b/.test(d)) {
      category = "access";
    }
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ category }),
        },
      ],
    };
  },
);

mcpServer.registerTool(
  "fetch_account_invoice_stub",
  {
    description: "Stub last invoice summary for an account id.",
    inputSchema: z.object({ accountId: z.string() }),
  },
  async ({ accountId }) => ({
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          accountId,
          invoiceId: "INV-10042",
          amount: "49.00 USD",
          period: "2026-03",
          status: "paid",
        }),
      },
    ],
  }),
);

mcpServer.registerTool(
  "fetch_service_health_stub",
  {
    description: "Stub dependency health for a named service.",
    inputSchema: z.object({ serviceName: z.string() }),
  },
  async ({ serviceName }) => ({
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          serviceName,
          status: "degraded",
          message: "Elevated latency in demo stub; no real check performed.",
          checkedAt: new Date().toISOString(),
        }),
      },
    ],
  }),
);

mcpServer.registerTool(
  "create_support_ticket_stub",
  {
    description: "Stub ticket creation returning a ticket id.",
    inputSchema: z.object({
      category: z.enum(["billing", "technical", "access"]),
      summary: z.string(),
      severity: z.enum(["low", "medium", "high"]).optional(),
    }),
  },
  async ({ category, summary, severity }) => {
    const ticketId = `TCK-${Date.now().toString(36)}`;
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ ticketId, category, summary, severity }),
        },
      ],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
