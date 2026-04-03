const form = document.getElementById("run-form");
const output = document.getElementById("output");
const traceOut = document.getElementById("trace-out");
const toolTraceOut = document.getElementById("tool-trace-out");
const agentOut = document.getElementById("agent-out");
const hitlActions = document.getElementById("hitl-actions");
const skillNameSelect = document.getElementById("skillName");
const userInput = document.getElementById("userInput");
const emailPreviewOut = document.getElementById("email-preview-out");
const runStatusInline = document.getElementById("run-status-inline");
const statusBadge = document.getElementById("status-badge");
const spinner = document.getElementById("spinner");
const btnRun = document.getElementById("btn-run");
const btnNewChat = document.getElementById("btn-new-chat");
const errorCard = document.getElementById("error-card");
const errorOut = document.getElementById("error-out");
const skillMetaInline = document.getElementById("skill-meta-inline");
const chatTranscript = document.getElementById("chat-transcript");
const threadChip = document.getElementById("thread-chip");
const hitlChatBlocked = document.getElementById("hitl-chat-blocked");
const traceDetails = document.getElementById("trace-details");
const toolDetails = document.getElementById("tool-details");
const outputDetails = document.getElementById("output-details");

/** LangGraph / store id for multi-turn chat */
let activeThreadId = null;
/** Set when status is hitl_pending — used for resume URL */
let lastRunId = null;

/** @type {{ name: string, description: string, playbookVersion?: string, hitl?: boolean, mcpServerIds?: string[] }[]} */
let CATALOGUE_SKILLS = [];

/** Example prompts per skill (fixtures: candidate 5001 → job 101). */
const SKILL_INPUT_EXAMPLES = {
  "evidence-gated-reply":
    "Draft message variants for contact 5001 on job 101 (match context from fixtures).",
  "property-listing-touchpoint":
    "Listing L-42: the client said they're not sure yet — capture budget and areas; if interested, book a viewing.",
  "support-intake-router":
    "I was charged twice this month for my subscription — what should we do?",
  "data-analysis":
    "Show me total applications per job over the last 30 days and highlight any outliers",
  "web-research":
    "Research recent trends in agent orchestration and MCP tool wiring",
  "demo-echo": "Echo this back: hello from the agent harness",
};

const DEFAULT_INPUT_EXAMPLE = "Describe the task for this skill…";

function exampleForSkill(skillName) {
  return SKILL_INPUT_EXAMPLES[skillName] ?? DEFAULT_INPUT_EXAMPLE;
}

/**
 * Sets placeholder and pre-fills when empty, value is a known example, or reset.
 */
function applyUserInputExample(skillName, { reset = false } = {}) {
  const example = exampleForSkill(skillName);
  userInput.placeholder = example;
  const trimmed = userInput.value.trim();
  const isKnownExample = Object.values(SKILL_INPUT_EXAMPLES).includes(trimmed);
  if (reset || !trimmed || isKnownExample) {
    userInput.value = example;
  }
}

function openDebugPanels() {
  for (const el of [traceDetails, toolDetails, outputDetails]) {
    if (el) el.open = true;
  }
}

function setLoading(loading) {
  spinner.hidden = !loading;
  syncSendDisabled();
}

function setHitlChatBlocked(blocked) {
  hitlChatBlocked.hidden = !blocked;
  syncSendDisabled();
}

function syncSendDisabled() {
  const loading = !spinner.hidden;
  btnRun.disabled = loading || !hitlChatBlocked.hidden;
}

function setStatus(text, kind) {
  runStatusInline.hidden = false;
  statusBadge.textContent = text;
  statusBadge.className = `badge badge-${kind ?? "neutral"}`;
}

function showError(message) {
  if (!message) {
    errorCard.hidden = true;
    errorOut.textContent = "";
    return;
  }
  errorCard.hidden = false;
  errorOut.textContent = message;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shortThreadLabel(id) {
  const s = String(id);
  return s.length > 14 ? `${s.slice(0, 8)}…` : s;
}

function updateThreadInfo() {
  if (!activeThreadId) {
    threadChip.textContent = "New chat";
    threadChip.className = "thread-chip thread-chip-new";
    threadChip.title = "";
  } else {
    threadChip.textContent = shortThreadLabel(activeThreadId);
    threadChip.className = "thread-chip thread-chip-active";
    threadChip.title = activeThreadId;
  }
}

function appendChatMessage(role, text) {
  const div = document.createElement("div");
  div.className = `chat-msg ${role}`;
  const label = role === "user" ? "You" : "Assistant";
  div.innerHTML = `<span class="chat-meta">${label}</span>${escapeHtml(text)}`;
  chatTranscript.appendChild(div);
  chatTranscript.scrollTop = chatTranscript.scrollHeight;
}

function clearConversationUi() {
  chatTranscript.innerHTML = "";
  activeThreadId = null;
  lastRunId = null;
  hitlActions.hidden = true;
  setHitlChatBlocked(false);
  updateThreadInfo();
  emailPreviewOut.textContent = "—";
}

/** Clears thread, panels, and HITL draft — use for New chat or skill change. */
function beginNewChatSession(flashMessage) {
  clearConversationUi();
  const correction = document.getElementById("correctionText");
  if (correction) correction.value = "";
  output.textContent = flashMessage;
  traceOut.textContent = "—";
  toolTraceOut.innerHTML = "—";
  agentOut.textContent = "—";
  showError("");
  runStatusInline.hidden = true;
  applyUserInputExample(skillNameSelect.value, { reset: true });
}

async function loadCatalogue() {
  try {
    const r = await fetch("/meta/catalogue");
    const j = await r.json();
    CATALOGUE_SKILLS = j.skills ?? [];
  } catch {
    CATALOGUE_SKILLS = [];
  }
}

function fillSkillSelect() {
  if (!CATALOGUE_SKILLS.length) {
    skillNameSelect.innerHTML = `<option value="demo-echo">demo-echo</option>`;
    return;
  }
  skillNameSelect.innerHTML = CATALOGUE_SKILLS.map(
    (s) =>
      `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`,
  ).join("");
  const de = CATALOGUE_SKILLS.find((s) => s.name === "demo-echo");
  if (de) skillNameSelect.value = "demo-echo";
}

function updateSkillMeta() {
  const name = skillNameSelect.value;
  const s = CATALOGUE_SKILLS.find((x) => x.name === name);
  if (!s) {
    skillMetaInline.innerHTML =
      `<p class="muted small skill-meta-hint">Select a skill to see HITL / MCP metadata.</p>`;
    applyUserInputExample(name, { reset: false });
    return;
  }
  const desc = s.description ?
    `<p class="skill-desc">${escapeHtml(s.description)}</p>`
  : "";
  const tags = [];
  if (s.hitl) tags.push(`<span class="tag tag-hitl">HITL</span>`);
  if (s.mcpServerIds?.length) {
    tags.push(
      `<span class="tag tag-mcp">MCP: ${escapeHtml(s.mcpServerIds.join(", "))}</span>`,
    );
  } else {
    tags.push(`<span class="tag tag-llm">LLM only</span>`);
  }
  skillMetaInline.innerHTML =
    `${desc}<div class="skill-tags">${tags.join("")}</div>`;
  applyUserInputExample(name, { reset: false });
}

loadCatalogue().then(() => {
  fillSkillSelect();
  updateSkillMeta();
  updateThreadInfo();
  syncSendDisabled();
});

skillNameSelect.addEventListener("change", () => {
  beginNewChatSession("Skill changed — new conversation.");
  updateSkillMeta();
});

btnNewChat.addEventListener("click", () => {
  beginNewChatSession("Started new chat.");
});

function renderTrace(trace) {
  if (!trace?.length) {
    traceOut.textContent = "—";
    return;
  }
  traceOut.textContent = trace
    .map(
      (t) =>
        `${t.id}${t.skillName ? ` [${t.skillName}]` : ""}${t.detail ? ` — ${t.detail}` : ""}`,
    )
    .join("\n");
}

function renderToolTrace(entries) {
  if (!entries?.length) {
    toolTraceOut.innerHTML = "—";
    return;
  }
  toolTraceOut.innerHTML = entries
    .map((e) => {
      const err = e.error ? `<div class="tool-err">${escapeHtml(e.error)}</div>` : "";
      return `<details><summary><code>${escapeHtml(e.name)}</code>${e.durationMs != null ? ` <span class="muted">${e.durationMs}ms</span>` : ""}</summary><pre class="tool-pre">${escapeHtml(e.argsDigest ?? "—")}</pre><pre class="tool-pre">${escapeHtml(e.resultPreview ?? "—")}</pre>${err}</details>`;
    })
    .join("");
}

function assistantTextFromResponse(data) {
  return (
    data?.result?.proposalText ??
    data?.result?.finalText ??
    (data?.result ? JSON.stringify(data.result, null, 2) : "—")
  );
}

function renderAgentOutput(data) {
  const proposal = assistantTextFromResponse(data);
  if (proposal && proposal !== "—") {
    agentOut.textContent =
      typeof proposal === "string" ? proposal : JSON.stringify(proposal, null, 2);
    return;
  }
  agentOut.textContent = "—";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (lastRunId && hitlActions.hidden === false) {
    return;
  }

  showError("");
  output.textContent = "Running…";
  traceOut.textContent = "…";
  toolTraceOut.innerHTML = "—";
  agentOut.textContent = "…";
  hitlActions.hidden = true;
  setHitlChatBlocked(false);

  const inputText = userInput.value.trim();
  appendChatMessage("user", inputText);
  userInput.value = "";

  setLoading(true);
  setStatus("running", "running");

  const payload = {
    skillName: skillNameSelect.value,
    input: inputText,
    ...(activeThreadId ? { threadId: activeThreadId } : {}),
  };

  try {
    const response = await fetch("/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    output.textContent = JSON.stringify(data, null, 2);
    setLoading(false);
    openDebugPanels();

    if (!response.ok) {
      setStatus("failed", "failed");
      showError(data.error ?? `HTTP ${response.status}`);
      renderTrace(data.trace);
      appendChatMessage(
        "assistant",
        `[Error] ${data.error ?? response.status}`,
      );
      return;
    }

    const tid = data.threadId ?? data.runId;
    activeThreadId = tid ?? activeThreadId;
    updateThreadInfo();

    setStatus(data.status ?? "unknown", data.status === "completed" ? "ok" : "pending");
    renderTrace(data.trace);
    renderToolTrace(data.toolTrace);
    renderAgentOutput(data);

    const assistantReply = assistantTextFromResponse(data);
    appendChatMessage("assistant", assistantReply);

    if (data.status === "hitl_pending") {
      lastRunId = data.runId ?? null;
      setHitlChatBlocked(true);
      hitlActions.hidden = false;
    } else {
      lastRunId = null;
    }
  } catch (error) {
    setLoading(false);
    setStatus("failed", "failed");
    showError(String(error));
    output.textContent = JSON.stringify({ error: String(error) }, null, 2);
    appendChatMessage("assistant", `[Error] ${String(error)}`);
    openDebugPanels();
  }
});

async function resume(decision) {
  if (!lastRunId) return;
  const correctionText =
    document.getElementById("correctionText").value.trim() || undefined;
  setLoading(true);
  setStatus("running", "running");
  output.textContent = "Resuming…";
  showError("");
  try {
    const response = await fetch(`/runs/${encodeURIComponent(lastRunId)}/resume`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        decision,
        ...(correctionText ? { correctionText } : {}),
      }),
    });
    const data = await response.json();
    output.textContent = JSON.stringify(data, null, 2);
    setLoading(false);
    openDebugPanels();
    if (!response.ok) {
      setStatus("failed", "failed");
      showError(data.error ?? `HTTP ${response.status}`);
      return;
    }
    setStatus("completed", "ok");
    hitlActions.hidden = true;
    setHitlChatBlocked(false);
    const resumedThread = data.threadId ?? lastRunId;
    activeThreadId = resumedThread;
    lastRunId = null;
    updateThreadInfo();

    appendChatMessage(
      "assistant",
      `[HITL ${decision}] ${assistantTextFromResponse({ result: data.result })}`,
    );

    if (data.emailMock) {
      emailPreviewOut.textContent = `To: ${data.emailMock.to}\nSubject: ${data.emailMock.subject}\n\n${data.emailMock.bodyPreview ?? ""}`;
    }
    renderAgentOutput({ result: data.result });
    renderToolTrace(data.toolTrace);
  } catch (error) {
    setLoading(false);
    setStatus("failed", "failed");
    showError(String(error));
  }
}

document.getElementById("btn-approve").addEventListener("click", () => {
  resume("approve");
});
document.getElementById("btn-reject").addEventListener("click", () => {
  resume("reject");
});
document.getElementById("btn-edit").addEventListener("click", () => {
  resume("edit");
});
