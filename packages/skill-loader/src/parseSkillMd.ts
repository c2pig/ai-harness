import { parse as parseYaml } from "yaml";
import type { LoadedSkill, SkillFrontmatter } from "./types.js";

const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function parseFrontmatter(raw: string): { fm: Record<string, unknown>; body: string } {
  const lines = raw.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") {
    return { fm: {}, body: raw };
  }
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === "---") {
      end = i;
      break;
    }
  }
  if (end < 0) {
    return { fm: {}, body: raw };
  }
  const yamlBlock = lines.slice(1, end).join("\n");
  const body = lines.slice(end + 1).join("\n").replace(/^\n/, "");
  try {
    const fm = parseYaml(yamlBlock) as Record<string, unknown>;
    return { fm: fm && typeof fm === "object" ? fm : {}, body };
  } catch {
    return { fm: {}, body: raw };
  }
}

function coerceMetadata(v: unknown): Record<string, string> | undefined {
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v)) {
    if (typeof val === "string") out[k] = val;
  }
  return Object.keys(out).length ? out : undefined;
}

export function parseSkillMarkdown(
  dirName: string,
  rawMarkdown: string,
  catalogueRoot: string,
): LoadedSkill {
  const { fm, body } = parseFrontmatter(rawMarkdown);
  const name = typeof fm.name === "string" ? fm.name : "";
  const description = typeof fm.description === "string" ? fm.description : "";

  if (!name || !NAME_RE.test(name)) {
    throw new Error(`Invalid or missing skill name in SKILL.md (dir: ${dirName})`);
  }
  if (name !== dirName) {
    throw new Error(
      `Skill name "${name}" must match directory "${dirName}" (Agent Skills spec)`,
    );
  }
  if (!description.trim()) {
    throw new Error(`Missing description in SKILL.md for ${dirName}`);
  }

  const meta = coerceMetadata(fm.metadata);
  const frontmatter: SkillFrontmatter = {
    name,
    description,
    ...(typeof fm.license === "string" && { license: fm.license }),
    ...(typeof fm.compatibility === "string" && { compatibility: fm.compatibility }),
    ...(meta && { metadata: meta }),
    ...(typeof fm["allowed-tools"] === "string" && {
      "allowed-tools": fm["allowed-tools"],
    }),
  };

  const playbookVersion = frontmatter.metadata?.version;

  const mcpRaw = fm["mcp-server"] ?? fm["mcp-servers"];
  let mcpServerIds: string[] = [];
  if (typeof mcpRaw === "string" && mcpRaw.trim()) {
    mcpServerIds = [mcpRaw.trim()];
  } else if (Array.isArray(mcpRaw)) {
    mcpServerIds = mcpRaw.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((s) => s.trim());
  }

  const hitl = fm.hitl === true || fm.hitl === "true";

  const contextStrategyRaw = fm["context-strategy"];
  const contextStrategy =
    typeof contextStrategyRaw === "string" && contextStrategyRaw.trim()
      ? contextStrategyRaw.trim()
      : undefined;

  return {
    id: dirName,
    catalogueRoot,
    frontmatter,
    body,
    playbookVersion,
    mcpServerIds,
    hitl,
    ...(contextStrategy ? { contextStrategy } : {}),
  };
}
