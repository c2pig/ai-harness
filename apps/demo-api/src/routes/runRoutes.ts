import type { Express } from "express";
import { randomUUID } from "node:crypto";
import {
  postRunRequestSchema,
  type RunSnapshot,
  type SkillRunResult,
} from "@agent-harness/contracts";
import { getSkillOrThrow } from "@agent-harness/skill-loader";
import { runSkillInvocation } from "@agent-harness/ai-harness";
import { enrichRunContext, mergeRunContextFromInput } from "../skillRunStrategies.js";
import { traceStep } from "../traceUtil.js";
import type { DemoApiDeps } from "./deps.js";

function agentContextFromSnapshot(snap: RunSnapshot | undefined): Record<string, unknown> {
  return { ...(snap?.result?.agentContext ?? {}) };
}

export function registerRunRoutes(app: Express, deps: DemoApiDeps): void {
  const {
    store,
    skillsCatalog,
    skillRuntime,
    gatewayEnv,
    harnessLogger,
  } = deps;

  app.post("/runs", async (req, res) => {
    const parsed = postRunRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const body = parsed.data;
    const skillName = body.skillName?.trim() || "accumulate-knowledge-arch";

    if (!skillsCatalog.has(skillName)) {
      res.status(400).json({ error: `Unknown skill: ${skillName}` });
      return;
    }

    const skill = getSkillOrThrow(skillsCatalog, skillName);
    const userMessage = body.input.trim();
    const requestThreadId = body.threadId?.trim();

    let runId: string;
    let existingSnap: RunSnapshot | undefined;

    if (requestThreadId) {
      runId = requestThreadId;
      existingSnap = store.get(runId);
      if (existingSnap) {
        if (existingSnap.skillName !== skillName) {
          res.status(400).json({
            error: `Thread ${runId} belongs to skill "${existingSnap.skillName}", not "${skillName}".`,
          });
          return;
        }
        if (existingSnap.status === "hitl_pending") {
          res.status(409).json({
            error:
              "This conversation is awaiting HITL approval. Call POST /runs/:runId/resume before sending another message.",
            runId,
            threadId: runId,
            status: existingSnap.status,
          });
          return;
        }
      }
    } else {
      runId = randomUUID();
    }

    const storedCtx =
      existingSnap?.status === "completed"
        ? agentContextFromSnapshot(existingSnap)
        : {};
    const mergeBase =
      requestThreadId && existingSnap?.status === "completed"
        ? { ...storedCtx, ...(body.context ?? {}) }
        : body.context;
    const mergedContext = mergeRunContextFromInput(skill, userMessage, mergeBase);
    const agentContext = enrichRunContext(skill, mergedContext);

    const trace: RunSnapshot["trace"] =
      existingSnap && existingSnap.status === "completed"
        ? [
            ...existingSnap.trace,
            traceStep(`turn_${existingSnap.trace.length}`, "user_follow_up", skill.id),
          ]
        : [traceStep("start", "run_started", skill.id)];

    await harnessLogger.emit({
      event: "run_started",
      runId,
      workflowId: skill.id,
      runStatus: "running",
      skillName: skill.id,
      planSkillNames: skill.mcpServerIds,
      extra: {
        mcpServers: skill.mcpServerIds,
        hitl: skill.hitl,
        continued: Boolean(requestThreadId),
      },
    });

    try {
      const inv = await runSkillInvocation(
        {
          skill,
          userMessage,
          context: agentContext,
          threadId: runId,
          phase: "initial",
        },
        skillRuntime,
      );

      await harnessLogger.emitToolTrace(runId, skill.id, skill.id, inv.toolTrace);

      trace.push(traceStep("agent", `agent_${inv.status}`, skill.id));

      if (inv.status === "hitl_pending") {
        trace.push(traceStep("hitl_pending", "awaiting_human", skill.id));
        const proposalResult: SkillRunResult = {
          phase: "proposal",
          agentContext,
          proposalText: inv.resultText,
          messagesPreview: inv.messagesPreview,
        };
        const snapshot: RunSnapshot = {
          runId,
          workflowId: skill.id,
          status: "hitl_pending",
          skillName: skill.id,
          result: proposalResult,
          hitlPendingSince: new Date().toISOString(),
          trace,
          threadId: runId,
          messagesPreview: inv.messagesPreview,
          toolTrace: inv.toolTrace,
        };
        store.save(snapshot);

        await harnessLogger.emit({
          event: "hitl_opened",
          runId,
          workflowId: skill.id,
          runStatus: "hitl_pending",
          skillName: skill.id,
          hitl: {
            state: "pending_approval",
            pendingSince: snapshot.hitlPendingSince,
          },
        });

        res.json({
          runId,
          threadId: runId,
          status: "hitl_pending",
          skillName: skill.id,
          result: snapshot.result,
          trace,
          toolTrace: inv.toolTrace,
          messagesPreview: inv.messagesPreview,
        });
        return;
      }

      const priorTools =
        existingSnap?.status === "completed"
          ? (existingSnap.toolTrace ?? [])
          : [];
      const completedResult: SkillRunResult = {
        phase: "completed",
        agentContext,
        finalText: inv.resultText,
      };
      const snapshot: RunSnapshot = {
        runId,
        workflowId: skill.id,
        status: "completed",
        skillName: skill.id,
        result: completedResult,
        trace,
        threadId: runId,
        messagesPreview: inv.messagesPreview,
        toolTrace: [...priorTools, ...inv.toolTrace],
      };
      store.save(snapshot);

      await harnessLogger.emit({
        event: "run_completed",
        runId,
        workflowId: skill.id,
        runStatus: "completed",
        skillName: skill.id,
        extra: { modelId: gatewayEnv.model },
      });

      res.json({
        runId,
        threadId: runId,
        status: "completed",
        skillName: skill.id,
        result: snapshot.result,
        trace,
        toolTrace: inv.toolTrace,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      trace.push(traceStep("failed", msg, skill.id));
      await harnessLogger.emit({
        event: "run_failed",
        runId,
        workflowId: skill.id,
        runStatus: "failed",
        skillName: skill.id,
        error: msg,
      });
      res.status(500).json({ runId, threadId: runId, error: msg, trace });
    }
  });

  app.get("/runs/:runId", (req, res) => {
    const snap = store.get(req.params.runId);
    if (!snap) {
      res.status(404).json({ error: "run not found" });
      return;
    }
    res.json(snap);
  });
}
