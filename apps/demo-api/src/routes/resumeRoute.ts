import type { Express } from "express";
import {
  resumeRunBodySchema,
  type RunSnapshot,
  type SkillRunResult,
} from "@agent-harness/contracts";
import { getSkillOrThrow } from "@agent-harness/skill-loader";
import { runSkillInvocation } from "@agent-harness/ai-harness";
import { traceStep } from "../traceUtil.js";
import type { DemoApiDeps } from "./deps.js";

export function registerResumeRoute(app: Express, deps: DemoApiDeps): void {
  const { store, skillsCatalog, skillRuntime, harnessLogger } = deps;

  app.post("/runs/:runId/resume", async (req, res) => {
    const parsed = resumeRunBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const body = parsed.data;
    const runId = req.params.runId;
    const snap = store.get(runId);
    if (!snap) {
      res.status(404).json({ error: "run not found" });
      return;
    }
    if (snap.status === "completed") {
      res.json({
        runId,
        threadId: runId,
        status: "completed",
        idempotent: true,
        emailMock: snap.emailMockPayload,
        result: snap.result,
      });
      return;
    }

    if (snap.status !== "hitl_pending") {
      res
        .status(409)
        .json({ error: "run not awaiting approval", status: snap.status });
      return;
    }

    const skill = getSkillOrThrow(skillsCatalog, snap.skillName);
    if (!skill.hitl) {
      res.status(409).json({ error: "skill does not use HITL" });
      return;
    }

    const agentContext = snap.result?.agentContext ?? {};

    await harnessLogger.emit({
      event: "hitl_resumed",
      runId,
      workflowId: snap.workflowId,
      runStatus: "running",
      skillName: skill.id,
      extra: { decision: body.decision },
    });

    try {
      const inv = await runSkillInvocation(
        {
          skill,
          userMessage: "",
          context: agentContext,
          threadId: snap.threadId ?? runId,
          phase: "resume",
          resume: {
            decision: body.decision,
            correctionText: body.correctionText,
          },
        },
        skillRuntime,
      );

      await harnessLogger.emitToolTrace(runId, skill.id, skill.id, inv.toolTrace);

      const proposal =
        snap.result?.phase === "proposal" ? (snap.result.proposalText ?? "") : "";
      const bodyPreview =
        body.decision === "edit" && body.correctionText?.trim()
          ? body.correctionText.trim()
          : inv.resultText ?? proposal;

      const emailMock = {
        to: `party-${String(agentContext.hirerId ?? "unknown")}@example.com`,
        subject: `[Agent harness] ${skill.id} — approved`,
        bodyPreview: bodyPreview.slice(0, 500),
      };

      await harnessLogger.emit({
        event: "side_effect_mock_email",
        runId,
        workflowId: snap.workflowId,
        runStatus: "completed",
        skillName: skill.id,
        extra: { emailMock },
      });

      const prev = snap.result;
      const completedResult: SkillRunResult = {
        phase: "completed",
        agentContext: prev?.agentContext ?? {},
        ...(prev?.phase === "proposal"
          ? {
              proposalText: prev.proposalText,
              messagesPreview: prev.messagesPreview,
            }
          : {}),
        finalText: inv.resultText,
        decision: body.decision,
        correctionText: body.correctionText,
      };

      const completed: RunSnapshot = {
        ...snap,
        status: "completed",
        emailMockPayload: emailMock,
        result: completedResult,
        trace: [...snap.trace, traceStep("resume", body.decision, skill.id)],
        messagesPreview: inv.messagesPreview,
        toolTrace: [...(snap.toolTrace ?? []), ...inv.toolTrace],
      };
      store.save(completed);

      await harnessLogger.emit({
        event: "run_completed",
        runId,
        workflowId: snap.workflowId,
        runStatus: "completed",
        skillName: skill.id,
      });

      res.json({
        runId,
        threadId: runId,
        status: "completed",
        emailMock,
        result: completed.result,
        toolTrace: inv.toolTrace,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await harnessLogger.emit({
        event: "run_failed",
        runId,
        workflowId: snap.workflowId,
        runStatus: "failed",
        skillName: skill.id,
        error: msg,
      });
      res.status(500).json({ runId, error: msg });
    }
  });
}
