import { describe, expect, it } from "vitest";
import { parseSkillMarkdown } from "./parseSkillMd.js";

describe("parseSkillMarkdown", () => {
  it("parses minimal valid SKILL.md", () => {
    const raw = `---
name: test-skill
description: A test skill for unit tests. Use when testing parsers.
---
Body here.
`;
    const s = parseSkillMarkdown("test-skill", raw, "/tmp/cat");
    expect(s.id).toBe("test-skill");
    expect(s.body.trim()).toBe("Body here.");
    expect(s.frontmatter.name).toBe("test-skill");
  });

  it("throws when name mismatches directory", () => {
    const raw = `---
name: wrong-name
description: x
---
`;
    expect(() => parseSkillMarkdown("test-skill", raw, "/tmp")).toThrow(
      /must match directory/,
    );
  });

  it("parses mcp-server and hitl", () => {
    const raw = `---
name: web-research
description: Research topics using search tools.
mcp-server: mcp-tools-generic
hitl: true
---
Body.
`;
    const s = parseSkillMarkdown("web-research", raw, "/tmp/cat");
    expect(s.mcpServerIds).toEqual(["mcp-tools-generic"]);
    expect(s.hitl).toBe(true);
  });

  it("parses mcp-servers list", () => {
    const raw = `---
name: data-analysis
description: Analyze data.
mcp-servers:
  - mcp-tools-generic
  - mcp-mock-workflow
---
`;
    const s = parseSkillMarkdown("data-analysis", raw, "/tmp");
    expect(s.mcpServerIds).toEqual(["mcp-tools-generic", "mcp-mock-workflow"]);
  });
});
