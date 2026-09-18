import { closeSync, fstatSync, openSync, readSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { CodexStatus } from "./types.js";

const MAX_THREADS = 16;
const TAIL_BYTES = 512 * 1024;
const TOOL_CALL_TYPES = new Set([
  "function_call",
  "custom_tool_call",
  "mcp_tool_call",
  "web_search_call",
  "computer_initialize_state",
  "computer_call",
  "local_shell_call",
]);
const RUNNING_EVENT_TYPES = new Set([
  "exec_command_begin",
  "patch_apply_begin",
  "web_search_begin",
  "mcp_tool_call_begin",
]);
const COMPLETE_EVENT_TYPES = new Set(["task_complete", "turn_complete"]);
const ABORT_EVENT_TYPES = new Set(["task_aborted", "turn_aborted", "task_error"]);

export type RolloutEvent = {
  timestamp?: string;
  type?: string;
  payload?: { type?: unknown; name?: unknown; status?: unknown; level?: unknown; cwd?: unknown; [key: string]: unknown };
};

export type LocalThreadObservation = {
  threadId: string;
  status: CodexStatus;
  observedAt: number;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.toLowerCase() : "";
}

function isNeedsInput(event: RolloutEvent): boolean {
  const payload = event.payload ?? {};
  const subtype = text(payload.type);
  const name = text(payload.name);
  const status = text(payload.status);
  return subtype.includes("approval_request")
    || subtype.includes("request_user_input")
    || subtype.includes("needs_input")
    || subtype.includes("user_input_request")
    || name === "request_user_input"
    || status === "needs_approval"
    || status === "waiting_for_user";
}

function isError(event: RolloutEvent): boolean {
  const payload = event.payload ?? {};
  const subtype = text(payload.type);
  return event.type === "error"
    || subtype === "error"
    || subtype.endsWith("_error")
    || text(payload.level) === "error";
}

function isToolActivity(event: RolloutEvent): boolean {
  const payload = event.payload ?? {};
  const subtype = text(payload.type);
  return (event.type === "response_item" && TOOL_CALL_TYPES.has(subtype))
    || (event.type === "event_msg" && RUNNING_EVENT_TYPES.has(subtype));
}

function isReasoning(event: RolloutEvent): boolean {
  const subtype = text(event.payload?.type);
  return (event.type === "response_item" && subtype === "reasoning")
    || (event.type === "event_msg" && (subtype === "agent_reasoning" || subtype === "reasoning"));
}

export function reduceRolloutEvents(events: readonly RolloutEvent[], now = Date.now()): CodexStatus {
  let status: CodexStatus = "idle";
  let lastEventAt = 0;

  for (const event of events) {
    const timestamp = Date.parse(event.timestamp ?? "");
    if (Number.isFinite(timestamp)) lastEventAt = Math.max(lastEventAt, timestamp);
    const subtype = text(event.payload?.type);

    if (event.type === "event_msg" && subtype === "user_message") {
      status = "idle";
      continue;
    }
    if (event.type === "event_msg" && subtype === "task_started") {
      status = "working";
      continue;
    }
    if (isNeedsInput(event)) {
      status = "input";
      continue;
    }
    if (isError(event) || (event.type === "event_msg" && ABORT_EVENT_TYPES.has(subtype))) {
      status = "error";
      continue;
    }
    if (event.type === "event_msg" && COMPLETE_EVENT_TYPES.has(subtype)) {
      status = "complete";
      continue;
    }
    if (isToolActivity(event) || isReasoning(event)) {
      status = "working";
    }
  }

  // A crashed or abandoned rollout must not leave the physical key in WORKING forever.
  if (status === "working" && lastEventAt > 0 && now - lastEventAt > 30 * 60 * 1000) return "idle";
  return status;
}

function readTail(path: string): { content: string; observedAt: number } | undefined {
  let fd: number | undefined;
  try {
    fd = openSync(path, "r");
    const stat = fstatSync(fd);
    const length = Math.min(stat.size, TAIL_BYTES);
    const buffer = Buffer.alloc(length);
    readSync(fd, buffer, 0, length, Math.max(0, stat.size - length));
    return { content: buffer.toString("utf8"), observedAt: Math.max(stat.mtimeMs, stat.ctimeMs) };
  } catch {
    return undefined;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

function parseEvents(content: string): RolloutEvent[] {
  const lines = content.split(/\r?\n/);
  // The first line can be a partial JSON object when the tail starts mid-file.
  if (lines.length > 1) lines.shift();
  const events: RolloutEvent[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line) as RolloutEvent;
      if (event && typeof event === "object") events.push(event);
    } catch {
      // The last line may be in-flight while Codex is writing it.
    }
  }
  return events;
}

export function rolloutThreadId(file: string): string | undefined {
  return file.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:_|\.jsonl$)/i)?.[1];
}

export class LocalCodexStatus {
  private readonly cache = new Map<string, { observedAt: number; status: CodexStatus }>();

  close(): void {
    this.cache.clear();
  }

  observe(now = Date.now()): LocalThreadObservation[] {
    try {
      const files = sessionFiles(join(homedir(), ".codex", "sessions"));
      const observationsByThread = new Map<string, LocalThreadObservation>();
      for (const file of files.slice(0, MAX_THREADS)) {
        const threadId = rolloutThreadId(file);
        if (!threadId) continue;
        const tail = readTail(file);
        if (!tail) continue;
        const cached = this.cache.get(file);
        const events = cached?.observedAt === tail.observedAt ? undefined : parseEvents(tail.content);
        const status = cached?.observedAt === tail.observedAt
          ? cached.status
          : reduceRolloutEvents(events ?? [], now);
        this.cache.set(file, { observedAt: tail.observedAt, status });
        const previous = observationsByThread.get(threadId);
        const observation: LocalThreadObservation = {
          threadId,
          status,
          observedAt: tail.observedAt,
        };
        if (!previous || observation.observedAt >= previous.observedAt) {
          observationsByThread.set(threadId, observation);
        }
      }
      return [...observationsByThread.values()].sort((left, right) => right.observedAt - left.observedAt);
    } catch {
      return [];
    }
  }
}

function sessionFiles(root: string, depth = 0): string[] {
  if (depth > 3) return [];
  const files: Array<{ path: string; mtimeMs: number }> = [];
  let entries;
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch {
    return [];
  }
  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...sessionFiles(path, depth + 1).map((file) => ({ path: file, mtimeMs: safeMtime(file) })));
    } else if (entry.isFile() && /^rollout-.*\.jsonl$/i.test(entry.name)) {
      files.push({ path, mtimeMs: safeMtime(path) });
    }
  }
  return files.sort((left, right) => right.mtimeMs - left.mtimeMs).map((file) => file.path);
}

function safeMtime(path: string): number {
  try {
    return statSync(path).mtimeMs;
  } catch {
    return 0;
  }
}
