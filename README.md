# AI Harness

## Objective

This repo demonstrates that a **skill is a portable package**: a `SKILL.md` file that declares instructions, tool bindings, and HITL policy. The **AI Harness** is a domain-agnostic engine that loads any such package and runs it. The same orchestration pipe serves an echo test, a property cold-call flow, and a multi-step evidence workflow—showing that **skills are the unit of capability**, not the harness.

## Design thinking

1. **Orchestration is the first-order component** — It contains no domain intelligence. It builds the execution pipe: LLM loop, MCP tool dispatch, thread memory, HITL pause/resume. It is the same pipe regardless of which skill is loaded.

2. **Skill is the higher-order component** — A `SKILL.md` *configures* the pipe by injecting capability: which MCP tools to bind, what instructions to follow, whether HITL is required, how to branch. A skill is a self-contained package you add to the catalogue.

3. **Agent = orchestration (execution) + skill (capability)** — At runtime, the harness loads a skill by name, wires the declared MCP servers, injects context, and hands control to the LLM loop. The skill shapes what the agent *does*; the orchestration shapes *how* it runs.

## Out of scope

This repository is a **demonstration harness**, not a production platform:

- **Default memory** — Run and thread state are **in-memory** for the demo (LangGraph checkpointer). There is no production-grade retention or eviction policy for that path.
- **Optional long-term memory** — The separate package `@agent-harness/memory` (Mem0 OSS + local Ollama + optional Neo4j) adds **semantic** recall when you opt in (`MEMORY_ENABLED=true` and local infra). That path is still a PoC, not a production memory platform. See [packages/memory/README.md](packages/memory/README.md).
- **Observability** — The code may emit **structured logs** for local debugging (and optional CloudWatch wiring), but **full observability**—distributed tracing, metrics, SLOs, centralized log pipelines, and alerting—is not a goal of this PoC.

## Architecture

Runtime flow reads **left to right** inside the **Runtime boundary**. **Skills catalogues** and the **Domain Expert** sit in the **Domain boundary** (authoring and definitions); the two boundaries are stacked so they do not overlap in the diagram.

```mermaid
flowchart TB
  subgraph runtime [Runtime boundary]
    direction LR
    subgraph web [Web]
      WebClient[Browser UI]
    end
    subgraph demoApi [Demo API]
      DemoLayer[Express HTTP JSON static assets]
    end
    subgraph harnessApi [Harness API]
      HarnessLayer[Skill run ReAct MCP pool LLM]
    end
    subgraph memOpt [Optional memory]
      MemPkg["@agent-harness/memory Mem0"]
      Ollama[Ollama local]
      Neo4j[Neo4j Docker optional graph]
    end
    subgraph mcp [MCP]
      McpServers[stdio tool servers]
    end
    WebClient -->|"static assets and UI"| DemoLayer
    DemoLayer -->|"run resume and meta routes"| HarnessLayer
    DemoLayer -.->|"MEMORY_ENABLED"| MemPkg
    MemPkg -.-> Ollama
    MemPkg -.-> Neo4j
    HarnessLayer -.->|"longTermMemory search add"| MemPkg
    HarnessLayer -->|"discover and invoke tools"| McpServers
  end

  subgraph domainBoundary [Domain boundary]
    direction LR
    subgraph skillsCatalogues [Skills catalogues]
      Catalogue[SKILL.md trees and playbooks]
    end
    DomainExpert[Domain Expert]
    DomainExpert -.->|"author and maintain packages"| Catalogue
  end

  HarnessLayer -->|"load and validate skill"| Catalogue
```

## Demo

![AI Harness demo UI](assets/ai-harness-demo.gif)

Full-quality screen recording (with audio, if any): [`assets/ai-harness-demo.mov`](assets/ai-harness-demo.mov). The loop above is the same demo as [`assets/ai-harness-demo.gif`](assets/ai-harness-demo.gif) for inline viewing on GitHub.

## Skill complexity matrix

| Use case             | Skill                         | MCP server        | Tools used                     | HITL | Complexity                                                                     | Effort to replicate                                                            | Notes                                                       |
| -------------------- | ----------------------------- | ----------------- | ------------------------------ | ---- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| Echo / smoke test    | `demo-echo`                   | none              | 0                              | no   | Low — no MCP, pure LLM                                                        | Low — single SKILL.md, no tool wiring                                         | Baseline: proves the pipe works end-to-end                  |
| Web research         | `web-research`                | mcp-tools-generic | `web_search`, `text_transform` | no   | Low — 2 generic stubs                                                         | Low — SKILL.md + existing tools                                               | Adds MCP but linear flow, no branching                      |
| Data analysis        | `data-analysis`               | mcp-tools-generic | `database_query`, `calculate`  | yes  | Medium — MCP + HITL gate                                                      | Medium — must handle approval/reject resume cycle                             | First skill that exercises the HITL boundary                |
| Property touchpoint  | `property-listing-touchpoint` | mcp-tools-generic | 5 property tools               | no   | Medium — branching on classifier output                                       | Medium — 5 new stub tools + conditional SKILL.md                              | Demonstrates interest-based branching without HITL          |
| Support intake       | `support-intake-router`       | mcp-tools-generic | 4 support tools                | no   | Medium — 3-way category routing                                               | Medium — 4 new stub tools + triage logic in SKILL.md                          | Demonstrates multi-branch routing pattern                   |
| Evidence-gated reply | `evidence-gated-reply`        | mcp-mock-workflow | 6 workflow tools               | yes  | High — dedicated MCP server, multi-step gather/rank, HITL, context enrichment | High — separate MCP app, fixture data, run-context strategy, 6 stateful tools | Full-stack example: custom MCP + fixtures + HITL + strategy |

## Prerequisites

- **Node.js** >= 18
- **Optional Dev Container** — [`.devcontainer/`](.devcontainer/) provides Node, Ollama, and Neo4j for Mem0. See [packages/memory/README.md](packages/memory/README.md).

| Variable | Purpose |
| -------- | ------- |
| `LLM_ENDPOINT` | OpenAI-compatible API base URL (default `https://api.openai.com/v1`) |
| `LLM_API_KEY` | API key (required for demo-api startup) |
| `LLM_MODEL` | Model id (default `gpt-4o-mini`) |
| `PORT` | HTTP port (default `4010`) |
| `MEMORY_ENABLED` | Optional: set `true` to enable Mem0 long-term memory (requires Ollama; Neo4j optional for graph). |
| `OLLAMA_URL` | Optional: Ollama base URL for Mem0 (default `http://127.0.0.1:11434`). |
| `NEO4J_URL` | Optional: e.g. `bolt://localhost:7687` — when set, graph memory is enabled unless `MEM0_GRAPH_ENABLED=false`. |
| `NEO4J_USERNAME` / `NEO4J_PASSWORD` | Optional: Neo4j credentials (compose example uses password `harness-memory-local`). |
| `MEM0_GRAPH_ENABLED` | Optional: `true` / `false` to force graph on or off. |
| `HARNESS_CW_LOG_GROUP` | Optional: with `AWS_REGION`, also emit JSON lines to CloudWatch |
| `HARNESS_CW_STREAM_PREFIX` | Optional: CloudWatch stream prefix (default `harness-demo-local`) |
| `AWS_REGION` | Optional: required with `HARNESS_CW_LOG_GROUP` for CloudWatch |

## Quick start

```bash
npm install
npm run build
npm run dev
```

Open [http://localhost:4010](http://localhost:4010).

### Memory (optional)

To run the demo with **Mem0** enrichment (local Ollama + optional Neo4j):

```bash
npm run memory:up
# Pull models once: ollama pull nomic-embed-text:latest && ollama pull llama3.1:8b
export NEO4J_URL=bolt://localhost:7687 NEO4J_PASSWORD=harness-memory-local
npm run dev:memory
```

Full diagrams, env reference, and troubleshooting: [packages/memory/README.md](packages/memory/README.md).

Screen recording of the demo UI: [`assets/ai-harness-demo.mov`](assets/ai-harness-demo.mov) (GIF preview in [Demo](#demo)).

## Tests

```bash
npm test
```
