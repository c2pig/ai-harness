export interface SkillFrontmatter {
  name: string;
  description: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  "allowed-tools"?: string;
}

export interface LoadedSkill {
  /** Directory name under catalogue (must match frontmatter name per Agent Skills spec) */
  id: string;
  catalogueRoot: string;
  frontmatter: SkillFrontmatter;
  /** Markdown body after frontmatter */
  body: string;
  /** metadata.version if set */
  playbookVersion?: string;
  /**
   * MCP server ids from frontmatter `mcp-server` (string) or `mcp-servers` (list).
   * Empty = no MCP tools for this skill.
   */
  mcpServerIds: string[];
  /** From frontmatter `hitl: true` — human approval before final completion */
  hitl: boolean;
  /** Optional key for demo-api run-context strategy (e.g. fixture-enrichment). */
  contextStrategy?: string;
}

export interface SkillIndexEntry {
  name: string;
  description: string;
  playbookVersion?: string;
  hitl?: boolean;
  mcpServerIds?: string[];
}
