import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { promisify } from "node:util";
import { highestPriorityStatus, mapCodexStatus } from "./status.js";
import { LocalCodexStatus } from "./local-status.js";
import { mergeLocalSlots } from "./slot-merge.js";
import { sanitizeText, summaryHash } from "./sanitize.js";
import { usageFromWindows } from "./usage.js";
import type { CodexSnapshot, CodexSlot, PendingApproval, UsageWindow } from "./types.js";

const execFileAsync = promisify(execFile);
const BRIDGE_STATE_PATH = `${homedir()}/Library/Application Support/CodexDeck/codex-micro-bridge.json`;

type CdpTarget = { type?: string; url?: string; webSocketDebuggerUrl?: string };
type CdpResponse = {
  id?: number;
  error?: { message?: string };
  result?: { result?: { value?: unknown; exceptionDetails?: { text?: string } } };
};

function selectMainTarget(targets: readonly CdpTarget[]): CdpTarget | undefined {
  const candidates = targets.filter(
    (target) => target.type === "page" && target.webSocketDebuggerUrl && target.url?.startsWith("app://"),
  );
  return (
    candidates.find((target) => {
      try {
        const url = new URL(target.url ?? "");
        return url.pathname === "/index.html" && !url.search;
      } catch {
        return false;
      }
    }) ?? candidates.find((target) => !/avatar-overlay|composition-surface/i.test(target.url ?? ""))
  );
}

// This is the only place that knows about Codex renderer internals.
const SNAPSHOT_EXPRESSION = [
  "(async () => {",
  "  const urls = [...new Set([...document.querySelectorAll('link[href], script[src]')].map((element) => element.href || element.src))].filter((url) => url.includes('/assets/') && url.endsWith('.js'));",
  "  const namespaces = [];",
  "  for (const url of urls) { try { namespaces.push(await import(url)); } catch {} }",
  "  const values = namespaces.flatMap((namespace) => Object.values(namespace));",
  "  const root = document.getElementById('root');",
  "  const reactKey = root && Object.getOwnPropertyNames(root).find((key) => key.startsWith('__reactContainer$'));",
  "  const resolvers = values.filter((candidate) => candidate && typeof candidate === 'object' && typeof candidate.resolve === 'function' && typeof candidate.createSubscriberAtom === 'function');",
  "  const queue = reactKey ? [root[reactKey]] : []; const seen = new Set(); let found = null;",
  "  while (queue.length && seen.size < 30000 && !found) {",
  "    const fiber = queue.pop(); if (!fiber || seen.has(fiber)) continue; seen.add(fiber);",
  "    const contexts = [fiber.memoizedProps?.value]; let dependency = fiber.dependencies?.firstContext;",
  "    while (dependency) { contexts.push(dependency.memoizedValue); dependency = dependency.next; }",
  "    for (const context of contexts) {",
  "      if (!(context instanceof Map)) continue;",
  "      for (const node of context.values()) { if (!node?.store || typeof node.store.get !== 'function') continue;",
  "        for (const resolver of resolvers) { try { const slots = node.store.get(resolver.resolve(node, context)); if (Array.isArray(slots) && slots.length === 6 && slots.every((slot, index) => slot?.id === index)) { found = slots; break; } } catch {} }",
  "        if (found) break;",
  "      }",
  "      if (found) break;",
  "    }",
  "    queue.push(fiber.child, fiber.sibling);",
  "  }",
  "  const resolveStatus = (slot) => { const local = slot?.localStatus || {}; const remote = slot?.remoteStatus || {}; const directStatus = String(slot?.status || slot?.state || slot?.lifecycle || '').toLowerCase(); const localStatus = String(local.status || '').toLowerCase(); const chip = String(local.pendingChip || '').toLowerCase(); const remoteStatus = String(remote.latestTurnStatus || '').toLowerCase(); const combined = JSON.stringify({ slot, local, remote }).toLowerCase(); if (directStatus === 'error' || localStatus === 'error' || remoteStatus === 'failed' || /\\b(error|failed|aborted)\\b/.test(combined)) return 'error'; if (directStatus === 'approval' || directStatus === 'awaiting-approval' || chip === 'approval' || /approval_request|needs_approval|awaiting[_-]approval|pending[_-]approval|permission[_-]?(request|required)|confirm[_-]?request/.test(combined)) return 'awaiting-approval'; if (directStatus === 'input' || directStatus === 'awaiting-response' || chip === 'response' || /request_user_input|needs[_-]input|waiting[_-]for[_-]user|awaiting[_-]response|input[_-]?required/.test(combined)) return 'awaiting-response'; if (directStatus === 'working' || directStatus === 'running' || directStatus === 'thinking' || localStatus === 'loading' || /\\b(thinking|running|loading|pending|in_progress|streaming|generating|working)\\b/.test(combined)) return 'working'; if (directStatus === 'complete' || directStatus === 'completed' || directStatus === 'done' || local.unread || /\\b(complete|completed|done|success)\\b/.test(combined)) return 'complete'; return 'idle'; };",
  "  const slots = (found || []).map((slot, index) => ({ id: index, threadKey: slot?.threadKey || null, selected: slot?.selected === true, status: resolveStatus(slot) }));",
  "  const activeElement = document.querySelector('[data-app-action-sidebar-thread-id][data-app-action-sidebar-thread-active=\"true\"]') || document.querySelector('[data-app-action-sidebar-thread-id][aria-current=\"page\"]');",
  "  const activeThreadId = document.querySelector('[data-above-composer-conversation-id]')?.getAttribute('data-above-composer-conversation-id') || activeElement?.getAttribute('data-app-action-sidebar-thread-id') || undefined;",
  "  const clean = (value) => String(value || '').replace(/[\\x00-\\x1F\\x7F]/g, '').replace(/\\s+/g, ' ').trim().slice(0, 240);",
  "  const kindOf = (text) => { const value = text.toLowerCase(); if (/\\b(npm|pnpm|yarn|git|cargo|python|node|bash|zsh|shell|command)\\b/.test(value)) return 'shell'; if (/\\b(http|https|network|website|domain|host)\\b/.test(value)) return 'network'; if (/\\b(read|file read|open file)\\b/.test(value)) return 'file-read'; if (/\\b(write|file write|patch|edit|create file|change)\\b/.test(value)) return 'file-write'; if (/\\b(app|application|launch)\\b/.test(value)) return 'external-app'; return 'other'; };",
  "  const surfaces = [...document.querySelectorAll('[data-codex-approval-surface],[data-approval-request-id],[data-request-id]')].filter((surface, index, all) => all.indexOf(surface) === index).map((surface) => { const clone = surface.cloneNode(true); clone.querySelectorAll('button,[role=\"button\"],form').forEach((element) => element.remove()); const text = clean(clone.textContent); const candidates = [...surface.querySelectorAll('pre,code,[data-command],[data-file-path]')].map((element) => clean(element.textContent || element.getAttribute('data-command') || element.getAttribute('data-file-path'))).filter((value) => value.length > 1); const summary = candidates[0] || text.split(' ').find((value) => value.length > 1) || text; const approvalId = ['data-approval-request-id','data-request-id','data-call-id'].map((name) => surface.getAttribute(name)).find(Boolean) || undefined; return { summary: clean(summary), detail: text !== clean(summary) ? text : undefined, kind: kindOf(summary + ' ' + text), approvalId }; });",
  "  let usage;",
  "  const clients = []; const fiberQueue = reactKey ? [root[reactKey]] : []; const fiberSeen = new Set(); while (fiberQueue.length && fiberSeen.size < 30000) { const fiber = fiberQueue.pop(); if (!fiber || fiberSeen.has(fiber)) continue; fiberSeen.add(fiber); const contexts = [fiber.memoizedProps?.value]; let dependency = fiber.dependencies?.firstContext; while (dependency) { contexts.push(dependency.memoizedValue); dependency = dependency.next; } for (const context of contexts) if (context && typeof context.getQueryCache === 'function' && typeof context.getQueryData === 'function' && !clients.includes(context)) clients.push(context); fiberQueue.push(fiber.child, fiber.sibling); }",
  "  for (const client of clients) { try { const query = client.getQueryCache().getAll().find((candidate) => JSON.stringify(candidate.queryKey) === '[\"rate-limit-status\"]'); const data = query?.state?.data?.rate_limit; if (!data) continue; const normalize = (window) => { if (!window) return null; const used = Number(window.used_percent); const seconds = Number(window.limit_window_seconds); if (!Number.isFinite(used) || !Number.isFinite(seconds)) return null; const bounded = Math.min(100, Math.max(0, used)); const reset = typeof window.reset_at === 'string' ? Date.parse(window.reset_at) : Number(window.reset_at); return { kind: Math.abs(seconds / 60 - 300) <= 1 ? 'five-hour' : Math.abs(seconds / 60 - 10080) <= 1 ? 'weekly' : 'other', usedPercent: bounded, remainingPercent: 100 - bounded, resetsAt: Number.isFinite(reset) ? (reset < 100000000000 ? reset * 1000 : reset) : undefined }; }; usage = { windows: [normalize(data.primary_window), normalize(data.secondary_window)].filter(Boolean), observedAt: Number(query?.state?.dataUpdatedAt) || Date.now() }; break; } catch {} }",
  "  const approvals = slots.filter((slot) => slot.status === 'awaiting-approval' && slot.threadKey).map((slot) => { const surface = slot.threadKey === activeThreadId ? surfaces[0] : undefined; const summary = surface?.summary || 'Open Codex to review'; return { threadId: slot.threadKey, ...(surface?.approvalId ? { approvalId: surface.approvalId } : {}), kind: surface?.kind || 'other', summary, ...(surface?.detail ? { detail: surface.detail } : {}), ...(surface?.summary ? { summaryHash: summary.split('').reduce((hash, character) => ((hash ^ character.charCodeAt(0)) * 16777619) >>> 0, 2166136261).toString(16) } : {}) }; });",
  "  return { slots, activeThreadId, approvals, usage };",
  "})()",
].join("\n");

export class CodexConnection {
  private socket?: WebSocket;
  private connecting?: Promise<void>;
  private requestId = 0;
  private readonly localStatus = new LocalCodexStatus();
  private readonly pending = new Map<number, { resolve: (message: CdpResponse) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();

  async snapshot(): Promise<CodexSnapshot> {
    const raw = (await this.evaluate(SNAPSHOT_EXPRESSION)) as {
      slots?: Array<{ id: number; threadKey?: string | null; selected?: boolean; status?: unknown }>;
      activeThreadId?: string;
      approvals?: PendingApproval[];
      usage?: { windows?: UsageWindow[]; observedAt?: number };
    };
    const slots: CodexSlot[] = (raw.slots ?? []).map((slot) => ({
      id: slot.id,
      threadKey: slot.threadKey,
      selected: slot.selected,
      status: mapCodexStatus(slot.status),
    }));
    // The renderer's six Micro slots do not always contain every active desktop
    // task. Merge rollout observations by thread identity so a visible task is
    // not duplicated while a distinct active task is still counted.
    const localObservations = this.localStatus.observe();
    const mergedSlots = mergeLocalSlots(slots, localObservations);
    const activeObservation = raw.activeThreadId
      ? localObservations.find((observation) => observation.threadId === raw.activeThreadId)
      : undefined;
    const workspacePath = activeObservation?.workspacePath ?? localObservations.find((observation) => observation.workspacePath)?.workspacePath;
    const windows = (raw.usage?.windows ?? []).filter((window) => window.kind === "five-hour" || window.kind === "weekly");
    return {
      connected: true,
      activeThreadId: raw.activeThreadId,
      ...(workspacePath ? { workspacePath } : {}),
      workspaces: localObservations,
      approvals: (raw.approvals ?? []).map((approval) => ({
        ...approval,
        summary: sanitizeText(approval.summary, 180),
        ...(approval.detail ? { detail: sanitizeText(approval.detail, 240) } : {}),
        ...(approval.summaryHash ? { summaryHash: approval.summaryHash } : approval.summary ? { summaryHash: summaryHash(approval.summary) } : {}),
      })),
      status: highestPriorityStatus(mergedSlots.map((slot) => slot.status)),
      slots: mergedSlots,
      ...(windows.length ? { usage: usageFromWindows(windows, raw.usage?.observedAt ?? Date.now()) } : {}),
      observedAt: Date.now(),
    };
  }

  async dispatchApproval(decision: "approve" | "reject"): Promise<void> {
    const key = decision === "approve" ? "ACT07" : "ACT08";
    await this.dispatch({ event: { key, act: 1, slot: null, threadKey: null } });
  }

  close(): void {
    this.localStatus.close();
    this.disconnect();
  }

  private async dispatch(payload: Record<string, unknown>): Promise<void> {
    await this.ensureConnected();
    const expression = [
      "(async () => {",
      "  const urls = [...new Set([...document.querySelectorAll('link[href], script[src]')].map((element) => element.href || element.src))].filter((url) => url.includes('/assets/') && url.endsWith('.js'));",
      "  let bus; for (const url of urls) { try { const namespace = await import(url); bus = Object.values(namespace).find((candidate) => candidate && typeof candidate === 'object' && candidate.handlers instanceof Map && (typeof candidate.dispatchHostMessage === 'function' || typeof candidate.dispatchMessage === 'function')); if (bus) break; } catch {} }",
      "  if (!bus) throw new Error('Codex event bus was not found.');",
      "  const dispatch = bus.dispatchHostMessage || bus.dispatchMessage;",
      "  if ((bus.handlers.get('codex-micro-hid-event')?.size || 0) === 0) dispatch.call(bus, { type: 'codex-micro-device-state-changed', state: { status: 'connected', error: null, battery: { percentage: 100, isCharging: true } } });",
      "  const deadline = Date.now() + 1200; while ((bus.handlers.get('codex-micro-hid-event')?.size || 0) === 0 && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 25));",
      "  if ((bus.handlers.get('codex-micro-hid-event')?.size || 0) === 0) throw new Error('Codex Micro input handler is not active.');",
      `  dispatch.call(bus, ${JSON.stringify({ type: "codex-micro-hid-event", ...payload })}); return true;`,
      "})()",
    ].join("\n");
    await this.evaluate(expression);
  }

  private async ensureConnected(): Promise<void> {
    if (this.socket?.readyState === WebSocket.OPEN) return;
    if (!this.connecting) this.connecting = this.connect().finally(() => { this.connecting = undefined; });
    await this.connecting;
  }

  private async connect(): Promise<void> {
    const port = await discoverDebugPort();
    const response = await fetch(`http://127.0.0.1:${port}/json/list`);
    if (!response.ok) throw new Error(`Codex bridge returned HTTP ${response.status}.`);
    const target = selectMainTarget((await response.json()) as CdpTarget[]);
    if (!target?.webSocketDebuggerUrl) throw new Error("Codex renderer target was not found.");
    const socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Codex bridge connection timed out.")), 3000);
      socket.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
      socket.addEventListener("error", () => { clearTimeout(timer); reject(new Error("Codex bridge connection failed.")); }, { once: true });
    });
    socket.addEventListener("message", (event) => this.handleMessage(String(event.data)));
    socket.addEventListener("close", () => this.disconnect(socket));
    socket.addEventListener("error", () => this.disconnect(socket));
    this.socket = socket;
  }

  private evaluate(expression: string): Promise<unknown> {
    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) return this.ensureConnected().then(() => this.evaluate(expression));
    const id = ++this.requestId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error("Codex renderer response timed out.")); }, 5000);
      this.pending.set(id, { timer, resolve: (message) => {
        if (message.error) { reject(new Error(message.error.message ?? "Codex CDP error.")); return; }
        const result = message.result?.result;
        if (result?.exceptionDetails) { reject(new Error(result.exceptionDetails.text ?? "Codex evaluation failed.")); return; }
        resolve(result?.value);
      }, reject });
      socket.send(JSON.stringify({ id, method: "Runtime.evaluate", params: { expression, awaitPromise: true, returnByValue: true } }));
    });
  }

  private handleMessage(raw: string): void {
    let message: CdpResponse; try { message = JSON.parse(raw) as CdpResponse; } catch { return; }
    if (message.id === undefined) return;
    const request = this.pending.get(message.id); if (!request) return;
    this.pending.delete(message.id); clearTimeout(request.timer); request.resolve(message);
  }

  private disconnect(expected?: WebSocket): void {
    if (expected && this.socket !== expected) return;
    const socket = this.socket; this.socket = undefined;
    if (socket && socket.readyState === WebSocket.OPEN) socket.close();
    for (const request of this.pending.values()) { clearTimeout(request.timer); request.reject(new Error("Codex bridge disconnected.")); }
    this.pending.clear();
  }
}

async function discoverDebugPort(): Promise<number> {
  const state = await readBridgeState();
  if (state && await isDebugPort(state.port)) return state.port;
  try {
    const { stdout } = await execFileAsync("/bin/ps", ["-axo", "command="], { timeout: 4000 });
    for (const line of stdout.split("\n")) {
      if (!line.includes(".app/Contents/MacOS/") || !line.includes("--remote-debugging-address=127.0.0.1")) continue;
      const port = Number.parseInt(line.match(/--remote-debugging-port(?:=|\s+)(\d+)/)?.[1] ?? "", 10);
      if (Number.isInteger(port) && await isDebugPort(port)) return port;
    }
  } catch {}
  throw new Error("Codex bridge is offline.");
}

async function readBridgeState(): Promise<{ port: number } | undefined> {
  try {
    const parsed = JSON.parse(await readFile(BRIDGE_STATE_PATH, "utf8")) as { port?: unknown };
    return typeof parsed.port === "number" && parsed.port > 0 && parsed.port < 65536 ? { port: parsed.port } : undefined;
  } catch {
    return undefined;
  }
}

async function isDebugPort(port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/json/version`);
    return response.ok;
  } catch {
    return false;
  }
}
