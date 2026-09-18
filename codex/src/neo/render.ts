import { formatPercent } from "../codex/usage.js";
import { workingTaskCount } from "../codex/status.js";
import { truncateForInfoBar } from "../codex/sanitize.js";
import type { CodexSnapshot, PendingApproval } from "../codex/types.js";

export type ControllerNotice = "" | "APPROVAL CHANGED" | "APPROVE FAILED" | "REJECT FAILED";

export function renderInfoBar(snapshot: CodexSnapshot, notice: ControllerNotice = ""): string {
  if (notice) return `${notice}\nWaiting for update`;
  if (!snapshot.connected) return "CODEX CONNECTION LOST\nStart / restart Codex";
  const approval = snapshot.approvals[0];
  if (snapshot.status === "input") return "CODEX · INPUT REQUIRED\nAgent is waiting for you";
  if (approval) return `CODEX · APPROVAL ${snapshot.approvals.length}\n${truncateForInfoBar(approval.summary)}`;
  if (snapshot.status === "error") return "CODEX · ERROR\nCheck the Codex window";
  const working = workingTaskCount(snapshot.slots);
  const first = snapshot.usage?.fiveHour?.remainingPercent;
  const second = snapshot.usage?.weekly?.remainingPercent;
  const state = working ? `${working} WORKING` : "READY";
  return `CODEX · ${state}\n5H ${formatPercent(first)}   WEEK ${formatPercent(second)}`;
}

export function renderApprovalInfoBar(approval: PendingApproval | undefined, index: number, total: number): string {
  if (!approval) return "CODEX · READY\nNo approval pending";
  return `⚠ ${approval.kind.toUpperCase()} · ${index + 1}/${total}\n${truncateForInfoBar(approval.summary)}`;
}

export function renderUsageKey(snapshot: CodexSnapshot, kind: "five-hour" | "weekly"): string {
  const window = kind === "five-hour" ? snapshot.usage?.fiveHour : snapshot.usage?.weekly;
  const remaining = window?.remainingPercent;
  const filled = remaining === undefined ? 0 : Math.round(Math.min(100, Math.max(0, remaining)) / 10);
  const meter = `${"█".repeat(filled)}${"░".repeat(10 - filled)}`;
  // Neo's native title area is only two lines tall when an action image is
  // present. Keep the label, percentage, and full meter visible together.
  return `${kind === "five-hour" ? "5H" : "WEEK"} ${formatPercent(remaining)}\n${meter}`;
}

export function renderStatusKey(snapshot: CodexSnapshot): string {
  if (!snapshot.connected) return "OFFLINE";
  if (snapshot.approvals.length) return `APPROVAL\n${snapshot.approvals.length} PENDING`;
  return snapshot.status.toUpperCase();
}
