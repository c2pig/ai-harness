---
name: demo-echo
description: No tools — the model rephrases or echoes the user input (tests zero-tool ReAct path).
metadata:
  version: "0.2.0"
  product: demo
hitl: false
---

# Demo echo

Reply briefly. Acknowledge the user’s **Input** text and any **Context (JSON)**. If they ask for a structured echo, return a short JSON object with keys `echo: true`, `summary` (one line), and repeat any `candidateId` / `hirerId` from Context when present.

Do not claim external tools or network access were used.
