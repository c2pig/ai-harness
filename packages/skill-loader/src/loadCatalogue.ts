import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseSkillMarkdown } from "./parseSkillMd.js";
import type { LoadedSkill, SkillIndexEntry } from "./types.js";

/**
 * Load all Agent Skills under `<root>/<product>/<skillDir>/SKILL.md`.
 */
export async function loadSkillCatalogue(
  productRoot: string,
): Promise<Map<string, LoadedSkill>> {
  const entries = await readdir(productRoot, { withFileTypes: true });
  const map = new Map<string, LoadedSkill>();

  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const skillPath = join(productRoot, ent.name, "SKILL.md");
    try {
      const raw = await readFile(skillPath, "utf8");
      const skill = parseSkillMarkdown(ent.name, raw, productRoot);
      map.set(skill.id, skill);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw e;
    }
  }

  return map;
}

export function buildSkillIndex(skills: Map<string, LoadedSkill>): SkillIndexEntry[] {
  return [...skills.values()].map((s) => ({
    name: s.frontmatter.name,
    description: s.frontmatter.description,
    playbookVersion: s.playbookVersion,
    hitl: s.hitl,
    mcpServerIds: s.mcpServerIds.length ? s.mcpServerIds : undefined,
  }));
}

export function getSkillOrThrow(
  skills: Map<string, LoadedSkill>,
  id: string,
): LoadedSkill {
  const s = skills.get(id);
  if (!s) throw new Error(`Unknown skill: ${id}`);
  return s;
}
