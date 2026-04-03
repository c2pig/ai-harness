import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import type { ToolTraceEntry } from "./types.js";

function mcpContentToText(content: unknown): string {
  if (!content || !Array.isArray(content)) {
    return "";
  }
  const text = content
    .filter(
      (c): c is { type: "text"; text: string } =>
        typeof c === "object" &&
        c !== null &&
        (c as { type?: string }).type === "text" &&
        typeof (c as { text?: unknown }).text === "string",
    )
    .map((c) => c.text)
    .join("\n");
  return text || JSON.stringify(content);
}

type JsonSchemaProperty = Record<string, unknown>;

const MAX_SCHEMA_DEPTH = 12;

function jsonSchemaPropertyToZod(prop: JsonSchemaProperty, depth: number): z.ZodTypeAny {
  if (depth > MAX_SCHEMA_DEPTH) {
    return z.unknown();
  }
  if (Array.isArray(prop.enum) && prop.enum.length > 0) {
    const strings = prop.enum.filter((x): x is string => typeof x === "string");
    if (strings.length === prop.enum.length && strings.length > 0) {
      if (strings.length === 1) {
        return z.literal(strings[0]);
      }
      return z.enum([strings[0], strings[1], ...strings.slice(2)] as [string, string, ...string[]]);
    }
  }
  const t = prop.type;
  if (t === "string") return z.string();
  if (t === "number" || t === "integer") return z.number();
  if (t === "boolean") return z.boolean();
  if (t === "array") return z.array(z.unknown());
  if (t === "object" && prop.properties && typeof prop.properties === "object") {
    const shape = buildZodShape(
      prop.properties as Record<string, JsonSchemaProperty>,
      prop.required as string[] | undefined,
      depth + 1,
    );
    return Object.keys(shape).length > 0 ? z.object(shape) : z.object({});
  }
  return z.unknown();
}

function buildZodShape(
  properties: Record<string, JsonSchemaProperty>,
  required: string[] | undefined,
  depth: number,
): Record<string, z.ZodTypeAny> {
  const shape: Record<string, z.ZodTypeAny> = {};
  const req = new Set(required ?? []);
  for (const [key, schema] of Object.entries(properties)) {
    if (!schema || typeof schema !== "object") continue;
    let zt = jsonSchemaPropertyToZod(schema as JsonSchemaProperty, depth);
    if (!req.has(key)) {
      zt = zt.optional();
    }
    shape[key] = zt;
  }
  return shape;
}

/**
 * Build a Zod object schema from MCP tool JSON Schema (root type object).
 * Falls back to passthrough object when schema is missing or unsupported.
 */
export function mcpInputSchemaToZod(inputSchema: unknown): z.ZodType<Record<string, unknown>> {
  const passthrough = z.object({}).passthrough();
  if (!inputSchema || typeof inputSchema !== "object") {
    return passthrough;
  }
  const s = inputSchema as Record<string, unknown>;
  if (s.type !== "object") {
    return passthrough;
  }
  const properties = s.properties;
  if (!properties || typeof properties !== "object") {
    return passthrough;
  }
  const shape = buildZodShape(
    properties as Record<string, JsonSchemaProperty>,
    s.required as string[] | undefined,
    0,
  );
  if (Object.keys(shape).length === 0) {
    return passthrough;
  }
  return z.object(shape).passthrough();
}

/**
 * List MCP tools and build LangChain `DynamicStructuredTool` instances.
 */
export async function discoverMcpTools(
  client: Client,
  onTrace?: (e: ToolTraceEntry) => void,
): Promise<DynamicStructuredTool[]> {
  const { tools } = await client.listTools();
  return tools.map((t) => {
    const name = t.name;
    const description = t.description ?? "";
    const schema = mcpInputSchemaToZod(t.inputSchema ?? {});
    return new DynamicStructuredTool({
      name,
      description,
      schema,
      func: async (input: Record<string, unknown>) => {
        const t0 = Date.now();
        const argsDigest = JSON.stringify(input).slice(0, 800);
        try {
          const res = await client.callTool({
            name,
            arguments: input,
          });
          const text = mcpContentToText(res.content);
          const durationMs = Date.now() - t0;
          onTrace?.({
            name,
            argsDigest,
            resultPreview: text.slice(0, 800),
            durationMs,
          });
          return text;
        } catch (err) {
          const durationMs = Date.now() - t0;
          const message = err instanceof Error ? err.message : String(err);
          onTrace?.({
            name,
            argsDigest,
            durationMs,
            error: message,
          });
          throw err;
        }
      },
    });
  });
}
