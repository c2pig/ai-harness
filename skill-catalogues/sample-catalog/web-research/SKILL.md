---
name: web-research
description: Research a topic using mock web search and text transforms, then summarize.
metadata:
  version: "1.0.0"
mcp-server: mcp-tools-generic
hitl: false
memory-entity-domain: legacy
---

# Web research

Use **web_search** for the user’s topic or question, then use **text_transform** with `summarize_stub` (and optionally `uppercase` / `lowercase`) to refine snippets.

End with a concise markdown summary: **Findings**, **Sources** (titles from stub results), and **Next steps** if applicable.
