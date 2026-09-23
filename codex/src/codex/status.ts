import type { CodexStatus } from "./types.js";

type StatusSlot = { id: number; threadKey?: string | null; status: CodexStatus };

function canonicalThreadId(threadKey: string): string {
  return threadKey.replace(/^local:/, "");
}

export function workingTaskCount(slots: readonly StatusSlot[]): number {
  // Renderer slots and rollout observations can describe the same task. Count
  // keyed work once. Unkeyed renderer slots are only a presence signal: the
  // renderer exposes several placeholder slots without a thread identity and
  // counting each of them is how two real tasks became "3" on the key.
  const seenThreads = new Set<string>();
  let keyedCount = 0;
  let hasUnkeyedWorking = false;
  for (const slot of slots) {
    if (slot.status !== "working") continue;
    if (!slot.threadKey) {
      hasUnkeyedWorking = true;
      continue;
    }
    const threadId = canonicalThreadId(slot.threadKey);
    if (seenThreads.has(threadId)) continue;
    seenThreads.add(threadId);
    keyedCount++;
  }
  return Math.max(keyedCount, hasUnkeyedWorking ? 1 : 0);
}

export function completedWorkingTaskCount(previous: readonly StatusSlot[], next: readonly StatusSlot[]): number {
  const nextById = new Map(next.map((slot) => [slot.id, slot]));
  let completed = 0;
  for (const slot of previous) {
    if (slot.status !== "working") continue;
    const current = nextById.get(slot.id);
    // Idle is a normal gap between tool calls/turns. Only a terminal complete
    // state (or a removed slot) represents work finishing and should pulse.
    if (!current || current.status === "complete") completed++;
  }
  return completed;
}

export function mapCodexStatus(value: unknown): CodexStatus {
  switch (value) {
    case "approval":
    case "awaiting-approval":
      return "approval";
    case "awaiting-response":
      return "input";
    case "working":
      return "working";
    case "complete":
    case "completed":
    case "done":
      return "complete";
    case "error":
      return "error";
    default:
      return "idle";
  }
}

export function highestPriorityStatus(statuses: readonly CodexStatus[]): CodexStatus {
  const priority: CodexStatus[] = ["approval", "input", "error", "working", "complete", "idle"];
  return priority.find((candidate) => statuses.includes(candidate)) ?? "idle";
}

export function statusKeyState(snapshot: {
  connected: boolean;
  approvals: readonly unknown[];
  status: CodexStatus | "offline";
  slots?: readonly StatusSlot[];
}): number {
  // Status has exactly two visual states: ready and working. Completion
  // flashing is rendered by the title, so a task finishing while the count
  // reaches zero still remains visually READY.
  return workingTaskCount(snapshot.slots ?? []) > 0 ? 1 : 0;
}

export function actionKeyState(command: "approve" | "reject" | "next" | "answer", snapshot: {
  status: CodexStatus | "offline";
}, approvalCount: number, questionCount = 0): number {
  if (command === "approve" || command === "reject") return approvalCount > 0 ? 1 : 0;
  if (command === "next") return approvalCount > 1 ? 1 : 0;
  if (command === "answer") return questionCount > 0 ? 1 : 0;
  return snapshot.status === "working" ? 1 : 0;
}
