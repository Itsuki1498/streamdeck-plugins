import assert from "node:assert/strict";
import test from "node:test";
import { actionKeyState, completedWorkingTaskCount, mapCodexStatus, statusKeyState, workingTaskCount } from "../src/codex/status.ts";
import { classifyWindowMinutes, formatResetCompact } from "../src/codex/usage.ts";
import { renderStatusImage, renderUsageImage } from "../src/neo/usage-image.ts";
import { reconcileApprovalQueue, removeApproval, selectNextApproval, isApprovalActionSafe, type ApprovalQueueState } from "../src/codex/queue.ts";
import { sanitizeText, summaryHash } from "../src/codex/sanitize.ts";
import { reduceRolloutEvents, rolloutThreadId } from "../src/codex/local-status.ts";
import { mergeLocalSlots } from "../src/codex/slot-merge.ts";
import { imageForState, normalizeCustomImageSettings } from "../src/neo/custom-image.ts";
import { gitStatusTitle, gitWorkspaceDisplayTitle, parseGitStatus } from "../src/git/status.ts";
import type { PendingApproval } from "../src/codex/types.ts";

const approval = (threadId: string, summary: string): PendingApproval => ({
  threadId,
  kind: "shell",
  summary,
  summaryHash: summaryHash(summary),
});

test("maps Codex statuses to the controller states", () => {
  assert.equal(mapCodexStatus("approval"), "approval");
  assert.equal(mapCodexStatus("awaiting-approval"), "approval");
  assert.equal(mapCodexStatus("awaiting-response"), "input");
  assert.equal(mapCodexStatus("working"), "working");
  assert.equal(mapCodexStatus("idle"), "idle");
});

test("reduces Codex rollout events into live work states", () => {
  const base = { timestamp: new Date().toISOString() };
  assert.equal(reduceRolloutEvents([
    { ...base, type: "event_msg", payload: { type: "user_message" } },
    { ...base, type: "event_msg", payload: { type: "task_started" } },
    { ...base, type: "response_item", payload: { type: "custom_tool_call" } },
  ]), "working");
  assert.equal(reduceRolloutEvents([
    { ...base, type: "event_msg", payload: { type: "task_started" } },
    { ...base, type: "event_msg", payload: { type: "approval_request" } },
  ]), "input");
  assert.equal(reduceRolloutEvents([
    { ...base, type: "event_msg", payload: { type: "task_started" } },
    { ...base, type: "event_msg", payload: { type: "turn_complete" } },
  ]), "complete");
});

test("recognizes forked Codex rollout filenames by their session id", () => {
  assert.equal(
    rolloutThreadId("/tmp/rollout-2026-09-18T19-17-37-01a0b398-c8fe-7491-b4e4-e90be4a730e8_01a0b405-8d88-7ce0-ad89-d2d956a48b17.jsonl"),
    "01a0b398-c8fe-7491-b4e4-e90be4a730e8",
  );
  assert.equal(
    rolloutThreadId("/tmp/rollout-2026-09-18T19-17-37-01a0b398-c8fe-7491-b4e4-e90be4a730e8.jsonl"),
    "01a0b398-c8fe-7491-b4e4-e90be4a730e8",
  );
});

test("classifies usage windows", () => {
  assert.equal(classifyWindowMinutes(300), "five-hour");
  assert.equal(classifyWindowMinutes(10080), "weekly");
  assert.equal(classifyWindowMinutes(60), "other");
});

test("formats compact reset times for the usage key", () => {
  const now = Date.now();
  assert.equal(formatResetCompact(now + 42 * 60_000, now), "42m");
  assert.equal(formatResetCompact(now + (5 * 60 + 20) * 60_000, now), "5h20m");
  assert.equal(formatResetCompact(now + (2 * 1440 + 3 * 60) * 60_000, now), "2d3h");
});

test("parses Git porcelain v2 status into dashboard counters", () => {
  const snapshot = parseGitStatus([
    "# branch.head main",
    "# branch.upstream origin/main",
    "# branch.ab +2 -1",
    "1 .M N... 100644 100644 100644 abc def file.ts",
    "1 M. N... 100644 100644 100644 abc def staged.ts",
    "u UU N... 100644 100644 100644 100644 abc def ghi conflict.ts",
    "? new.ts",
  ].join("\n"), "/repo/project");
  assert.equal(snapshot.state, "conflict");
  assert.equal(snapshot.repositoryName, "project");
  assert.equal(snapshot.branch, "main");
  assert.deepEqual({
    modified: snapshot.modifiedFiles,
    staged: snapshot.stagedFiles,
    untracked: snapshot.untrackedFiles,
    conflicts: snapshot.conflictFiles,
    ahead: snapshot.ahead,
    behind: snapshot.behind,
  }, { modified: 2, staged: 1, untracked: 1, conflicts: 1, ahead: 2, behind: 1 });
  assert.match(gitStatusTitle(snapshot), /^ROOT\nCONFLICT$/);
  assert.equal(gitWorkspaceDisplayTitle({ ...snapshot, workspacePath: "/repo/project/codex" }), "project/codex");
});

test("renders usage keys with a standard sans-serif raster image", () => {
  const now = Date.now();
  const image = renderUsageImage({ kind: "five-hour", usedPercent: 18, remainingPercent: 82, resetsAt: now + 90 * 60_000 }, "five-hour", now);
  assert.match(image, /^data:image\/(png;base64|svg\+xml;charset=utf-8),/);
  assert.match(renderUsageImage(undefined, "weekly", now), /^data:image\/(png;base64|svg\+xml;charset=utf-8),/);
  assert.match(renderUsageImage({ kind: "weekly", usedPercent: 30, remainingPercent: 70 }, "weekly", now, "data:image/png;base64,AA=="), /^data:image\/(png;base64|svg\+xml;charset=utf-8),/);
});

test("renders usage colors and status numbers without icon or full-canvas plates", () => {
  const svg = (image: string): string => decodeURIComponent(image.slice(image.indexOf(",") + 1));
  assert.match(svg(renderUsageImage({ kind: "weekly", usedPercent: 18, remainingPercent: 82 }, "weekly")), /#34d399/);
  assert.match(svg(renderUsageImage({ kind: "weekly", usedPercent: 60, remainingPercent: 40 }, "weekly")), /#fbbf24/);
  assert.match(svg(renderUsageImage({ kind: "weekly", usedPercent: 85, remainingPercent: 15 }, "weekly")), /#f87171/);
  assert.doesNotMatch(svg(renderUsageImage({ kind: "weekly", usedPercent: 18, remainingPercent: 82 }, "weekly")), /<image\s/);
  assert.doesNotMatch(svg(renderStatusImage({ connected: true, slots: [{ id: 0, status: "working" as const }], approvals: [], status: "working", observedAt: 1 })), /<image\s/);
});

test("renders the global status key with a standard sans-serif number", () => {
  const snapshot = {
    connected: true,
    slots: [{ id: 0, status: "working" as const, threadKey: "thread-a" }],
    approvals: [],
    status: "working" as const,
    observedAt: Date.now(),
  };
  assert.match(renderStatusImage(snapshot), /^data:image\/(png;base64|svg\+xml;charset=utf-8),/);
  const normal = decodeURIComponent(renderStatusImage(snapshot).split(",", 2)[1]);
  const pulsing = decodeURIComponent(renderStatusImage(snapshot, true).split(",", 2)[1]);
  assert.match(normal, /fill-opacity="\.86"/);
  assert.match(pulsing, /stroke="#34d399"/);
  assert.match(pulsing, />1<\/text>/);
  assert.notEqual(normal, pulsing);
});

test("keeps the ready count visible while pulsing the completion frame", () => {
  const svg = decodeURIComponent(renderStatusImage({
    connected: true,
    slots: [],
    approvals: [],
    status: "idle",
    observedAt: Date.now(),
  }, true).split(",", 2)[1]);
  assert.match(svg, /stroke="#34d399"/);
  assert.match(svg, /fill="#ffffff">0<\/text>/);
  assert.match(svg, />0<\/text>/);
});

test("selects custom images by action state and rejects non-image settings", () => {
  const normal = "data:image/png;base64,AA==";
  const alert = "data:image/jpeg;base64,/w==";
  const settings = normalizeCustomImageSettings({ customImage: normal, customAlertImage: alert, ignored: "path" });
  assert.equal(imageForState(settings, 0), normal);
  assert.equal(imageForState(settings, 1), alert);
  assert.equal(normalizeCustomImageSettings({ customImage: "/tmp/icon.png" }).customImages["0"], undefined);
});

test("counts active working slots and detects completed work", () => {
  const previous = [
    { id: 0, threadKey: "thread-a", status: "working" as const },
    { id: 1000, threadKey: "thread-a", status: "working" as const },
    { id: 1, threadKey: "thread-b", status: "working" as const },
  ];
  const next = [
    { id: 0, threadKey: "thread-a", status: "idle" as const },
    { id: 1, threadKey: "thread-b", status: "working" as const },
  ];
  assert.equal(workingTaskCount(previous), 2);
  assert.equal(completedWorkingTaskCount(previous, next), 1);
});

test("does not count unkeyed renderer placeholders as extra tasks", () => {
  assert.equal(workingTaskCount([
    { id: 0, threadKey: "thread-a", status: "working" as const },
    { id: 1, threadKey: "thread-b", status: "working" as const },
    { id: 2, status: "working" as const },
  ]), 2);
  assert.equal(workingTaskCount([
    { id: 0, status: "working" as const },
    { id: 1, status: "working" as const },
  ]), 1);
});

test("merges distinct local tasks without duplicating a visible thread", () => {
  const visible = [{ id: 0, threadKey: "thread-a", status: "working" as const }];
  const merged = mergeLocalSlots(visible, [
    { threadId: "thread-a", status: "working", observedAt: 1 },
    { threadId: "thread-b", status: "working", observedAt: 1 },
  ]);
  assert.equal(workingTaskCount(merged), 2);
  assert.deepEqual(merged.map((slot) => slot.threadKey), ["thread-a", "thread-b"]);
});

test("normalizes renderer local thread keys before merging rollout observations", () => {
  const merged = mergeLocalSlots([
    { id: 0, threadKey: "local:thread-a", status: "working" as const },
  ], [{ threadId: "thread-a", status: "working", observedAt: 1 }]);
  assert.equal(workingTaskCount(merged), 1);
  assert.equal(merged.length, 1);
});

test("promotes a matched rollout completion so Status can pulse", () => {
  const previous = [{ id: 0, threadKey: "thread-a", status: "working" as const }];
  const merged = mergeLocalSlots(previous, [{ threadId: "thread-a", status: "complete", observedAt: 2 }]);
  assert.equal(merged[0]?.status, "complete");
  assert.equal(completedWorkingTaskCount(previous, merged), 1);
});

test("does not add a rollout duplicate when the renderer already shows two tasks", () => {
  const merged = mergeLocalSlots([
    { id: 0, threadKey: "thread-a", status: "working" as const },
    { id: 1, threadKey: "thread-b", status: "working" as const },
  ], [{ threadId: "thread-current", status: "working", observedAt: 1 }]);
  assert.equal(workingTaskCount(merged), 2);
});

test("keeps the selected approval and wraps NEXT", () => {
  const first = approval("thread-a", "git status");
  const second = approval("thread-b", "git push origin main");
  const initial: ApprovalQueueState = { approvals: [first, second], selectedIndex: 1 };
  const reconciled = reconcileApprovalQueue(initial, [second, first]);
  assert.equal(reconciled.selectedIndex, 0);
  assert.equal(selectNextApproval(reconciled).selectedIndex, 1);
  assert.equal(selectNextApproval({ ...reconciled, selectedIndex: 1 }).selectedIndex, 0);
});

test("removes a settled approval and normalizes the index", () => {
  const first = approval("thread-a", "git status");
  const second = approval("thread-b", "git push origin main");
  const state: ApprovalQueueState = { approvals: [first, second], selectedIndex: 1 };
  const next = removeApproval(state, second);
  assert.deepEqual(next.approvals, [first]);
  assert.equal(next.selectedIndex, 0);
});

test("sanitizes ANSI, control characters, and long content", () => {
  assert.equal(sanitizeText("\u001b[31mgit push\u001b[0m\norigin\u0007 main"), "git push\norigin main");
  assert.equal(sanitizeText("abcdefghijklmnopqrstuvwxyz", 10), "abcdefghi…");
});

test("fails closed when the approval is not the active, identified request", () => {
  const target = approval("thread-a", "git push origin main");
  assert.equal(isApprovalActionSafe({
    connected: true,
    activeThreadId: "thread-b",
    slots: [{ id: 0, threadKey: "thread-a", status: "approval" }],
    approvals: [target],
    status: "approval",
    observedAt: Date.now(),
  }, target), false);
  assert.equal(isApprovalActionSafe({
    connected: true,
    activeThreadId: "thread-a",
    slots: [{ id: 0, threadKey: "thread-a", status: "approval" }],
    approvals: [target],
    status: "approval",
    observedAt: Date.now(),
  }, target), true);
});

test("maps the aggregate Codex status to the status key state", () => {
  const base = { connected: true, slots: [], approvals: [], observedAt: Date.now() };
  assert.equal(statusKeyState({ ...base, connected: false, status: "offline" }), 0);
  assert.equal(statusKeyState({ ...base, status: "approval", approvals: [approval("thread-a", "review")] }), 0);
  assert.equal(statusKeyState({ ...base, status: "working", slots: [{ id: 0, status: "working" }] }), 1);
  assert.equal(statusKeyState({ ...base, status: "error" }), 0);
  assert.equal(statusKeyState({ ...base, status: "idle" }), 0);
});

test("changes action states for approvals and active work", () => {
  assert.equal(actionKeyState("approve", { status: "idle" }, 0), 0);
  assert.equal(actionKeyState("approve", { status: "approval" }, 1), 1);
  assert.equal(actionKeyState("reject", { status: "approval" }, 1), 1);
  assert.equal(actionKeyState("next", { status: "approval" }, 2), 1);
});
