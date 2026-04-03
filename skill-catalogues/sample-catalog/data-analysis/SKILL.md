---
name: data-analysis
description: Run a mock SQL query, analyze rows with calculate, then present findings for human confirmation (HITL).
metadata:
  version: "1.0.0"
mcp-server: mcp-tools-generic
hitl: true
---

# Data analysis

1. Use **database_query** with a plausible SQL string aligned with the user question (data is mocked).
2. Use **calculate** for totals, ratios, or simple aggregates from the returned numbers.
3. Present a clear **Analysis** section: metrics, caveats (mock data), and a **Recommendation**.

The platform will pause for human approval after your first complete answer; keep that answer self-contained so a reviewer can approve or request edits.
