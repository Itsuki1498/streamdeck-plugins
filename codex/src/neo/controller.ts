import { CodexAdapter } from "../codex/adapter.js";
import { reconcileApprovalQueue, selectNextApproval, type ApprovalQueueState } from "../codex/queue.js";
import { actionKeyState, completedWorkingTaskCount, statusKeyState, workingTaskCount } from "../codex/status.js";
import type { CodexSnapshot, CodexWorkspace } from "../codex/types.js";
import { GitAdapter, type CodexGitCommand } from "../git/adapter.js";
import { gitStatusTitle, gitWorkspaceScopeTitle } from "../git/status.js";
import type { GitSnapshot } from "../git/types.js";
import type { StreamDeckAction } from "../streamdeck-runtime.js";
import { truncateForInfoBar } from "../codex/sanitize.js";
import { renderApprovalInfoBar, renderInfoBar, type ControllerNotice } from "./render.js";
import { renderStatusImage, renderUsageImage } from "./usage-image.js";

export type ControlCommand = "approve" | "reject" | "next" | "usage-five-hour" | "usage-weekly" | "status" | "infobar"
  | "git-status" | "git-diff" | "git-review" | "git-test" | "git-commit-prep"
  | "git-focus-1" | "git-focus-2" | "git-focus-3" | "git-focus-4" | "git-focus-5" | "git-focus-6";
type GitActionCommand = "git-diff" | "git-review" | "git-test" | "git-commit-prep";
type GitFocusCommand = "git-focus-1" | "git-focus-2" | "git-focus-3" | "git-focus-4" | "git-focus-5" | "git-focus-6";
type GitWorkspaceContext = { observation: CodexWorkspace; snapshot: GitSnapshot };
const maxGitFocusButtons = 6;

type DisplayAction = StreamDeckAction;

type RegisteredAction = { action: DisplayAction; command: ControlCommand; controller: string };

export class NeoController {
  private readonly adapter = new CodexAdapter();
  private readonly gitAdapter = new GitAdapter();
  private readonly actions = new Map<string, RegisteredAction>();
  private readonly imageSignatures = new Map<string, string>();
  private queue: ApprovalQueueState = { approvals: [], selectedIndex: 0 };
  private snapshot: CodexSnapshot = { connected: false, slots: [], approvals: [], status: "offline", observedAt: 0 };
  private gitSnapshot: GitSnapshot = { state: "no-repo", modifiedFiles: 0, stagedFiles: 0, untrackedFiles: 0, conflictFiles: 0, ahead: 0, behind: 0, observedAt: 0 };
  private gitWorkspaces: GitWorkspaceContext[] = [];
  private selectedGitThreadId?: string;
  private readonly gitActionStates = new Map<string, "ready" | "running" | "ok" | "fail">();
  private readonly gitActionResults = new Map<string, string>();
  private readonly gitNoticeTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private notice: ControllerNotice = "";
  private timer?: ReturnType<typeof setInterval>;
  private completionPulseTimer?: ReturnType<typeof setInterval>;
  private completionPulseUntil = 0;
  private completionPulsePhase = false;
  private refreshing = false;
  start(): void {
    if (this.timer) return;
    void this.refresh();
    this.timer = setInterval(() => void this.refresh(), 750);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    if (this.completionPulseTimer) clearInterval(this.completionPulseTimer);
    this.timer = undefined;
    this.completionPulseTimer = undefined;
    this.completionPulseUntil = 0;
    this.completionPulsePhase = false;
    for (const timer of this.gitNoticeTimers.values()) clearTimeout(timer);
    this.gitNoticeTimers.clear();
    this.gitActionStates.clear();
    this.gitActionResults.clear();
    this.adapter.close();
    this.gitAdapter.close();
    this.gitWorkspaces = [];
    this.selectedGitThreadId = undefined;
    this.gitSnapshot = { state: "no-repo", modifiedFiles: 0, stagedFiles: 0, untrackedFiles: 0, conflictFiles: 0, ahead: 0, behind: 0, observedAt: 0 };
  }

  register(action: DisplayAction, command: ControlCommand, controller: string): void {
    this.actions.set(action.id, { action, command, controller });
    this.imageSignatures.delete(action.id);
    this.start();
    void this.renderAction(action, command, controller);
  }

  unregister(action: Pick<DisplayAction, "id">): void {
    this.actions.delete(action.id);
    this.imageSignatures.delete(action.id);
    const timer = this.gitNoticeTimers.get(action.id);
    if (timer) clearTimeout(timer);
    this.gitNoticeTimers.delete(action.id);
    this.gitActionStates.delete(action.id);
    this.gitActionResults.delete(action.id);
    if (this.actions.size === 0) this.stop();
  }

  async handleKey(command: ControlCommand, action: DisplayAction): Promise<void> {
    try {
      switch (command) {
        case "approve":
        case "reject": {
          const approval = this.queue.approvals[this.queue.selectedIndex];
          if (!approval) throw new Error("No approval is pending.");
          await this.adapter.decide(approval, command);
          this.notice = "";
          await action.showOk?.();
          await this.refresh();
          break;
        }
        case "next":
          this.queue = selectNextApproval(this.queue);
          await this.renderAll();
          break;
        case "git-diff":
        case "git-review":
        case "git-test":
        case "git-commit-prep":
          await this.runGitCodexAction(command, action);
          break;
        case "git-focus-1":
        case "git-focus-2":
        case "git-focus-3":
        case "git-focus-4":
        case "git-focus-5":
        case "git-focus-6":
          this.selectGitWorkspace(command);
          await this.renderAll();
          break;
        case "usage-five-hour":
        case "usage-weekly":
        case "status":
        case "infobar":
        case "git-status":
          break;
      }
    } catch (error) {
      this.notice = command === "approve" ? "APPROVE FAILED" : command === "reject" ? "REJECT FAILED" : "";
      await action.showAlert();
      await this.renderAll();
      console.warn("Codex Neo action failed", error instanceof Error ? error.message : "unknown error");
    }
  }

  private async refresh(): Promise<void> {
    if (this.refreshing) return;
    this.refreshing = true;
    try {
      const next = await this.adapter.snapshot();
      if (completedWorkingTaskCount(this.snapshot.slots, next.slots) > 0) this.startCompletionPulse();
      this.snapshot = next;
      this.gitWorkspaces = await this.readGitWorkspaces(next);
      const selected = this.gitWorkspaces.find((context) => context.observation.threadId === this.selectedGitThreadId)
        ?? this.gitWorkspaces.find((context) => context.observation.threadId === next.activeThreadId)
        ?? this.gitWorkspaces[0];
      this.selectedGitThreadId = selected?.observation.threadId;
      this.gitSnapshot = selected?.snapshot ?? await this.gitAdapter.snapshot(next.workspacePath);
      this.queue = reconcileApprovalQueue(this.queue, next.approvals);
      this.notice = "";
    } catch {
      // Never keep approval data actionable after a bridge failure.
      this.snapshot = { connected: false, slots: [], approvals: [], status: "offline", observedAt: Date.now() };
      this.gitWorkspaces = [];
      this.selectedGitThreadId = undefined;
      this.gitSnapshot = await this.gitAdapter.snapshot(undefined);
      this.queue = { approvals: [], selectedIndex: 0 };
    } finally {
      this.refreshing = false;
      await this.renderAll();
    }
  }

  private async renderAll(): Promise<void> {
    await Promise.all([...this.actions.values()].map(({ action, command, controller }) => this.renderAction(action, command, controller)));
  }

  private async renderAction(action: DisplayAction, command: ControlCommand, controller: string): Promise<void> {
    const selected = this.queue.approvals[this.queue.selectedIndex];
    let title = controller === "Neo"
      ? selected
        ? renderApprovalInfoBar(selected, this.queue.selectedIndex, this.queue.approvals.length)
        : renderInfoBar(this.snapshot, this.notice)
      : "";
    if (action.isKey()) {
      let state = 0;
      if (command === "status") {
        state = statusKeyState(this.snapshot);
        const pulse = Date.now() < this.completionPulseUntil && this.completionPulsePhase;
        const count = workingTaskCount(this.snapshot.slots);
        await this.setImageIfChanged(action, `status:${state}:${count}:${pulse}`, renderStatusImage(this.snapshot, pulse), state);
        title = "";
      } else if (command === "usage-five-hour" || command === "usage-weekly") {
        const kind = command === "usage-five-hour" ? "five-hour" : "weekly";
        const window = kind === "five-hour" ? this.snapshot.usage?.fiveHour : this.snapshot.usage?.weekly;
        const remaining = window ? Math.round(window.remainingPercent) : "none";
        await this.setImageIfChanged(action, `usage:${kind}:${remaining}`, renderUsageImage(window, kind, Date.now()), 0);
        title = "";
      } else if (command === "approve" || command === "reject" || command === "next") {
        state = actionKeyState(command, this.snapshot, this.queue.approvals.length);
        title = "";
      } else if (command === "git-status") {
        state = this.gitSnapshot.state === "clean" || this.gitSnapshot.state === "no-repo" ? 0 : 1;
        title = gitStatusTitle(this.gitSnapshot);
      } else if (isGitFocusCommand(command)) {
        const context = this.gitWorkspaces[gitFocusIndex(command)];
        state = context?.observation.threadId === this.selectedGitThreadId ? 1 : 0;
        title = context ? gitWorkspaceScopeTitle(context.snapshot) : "";
      } else if (isGitCodexCommand(command)) {
        const status = this.gitActionStates.get(action.id) ?? "ready";
        state = status === "running" ? 1 : 0;
        const result = this.gitActionResults.get(action.id);
        title = status === "ok" && result
          ? `${gitActionLabel(command)}\n${result}`
          : `${gitActionLabel(command)}\n${status === "running" ? "RUNNING" : status === "fail" ? "FAIL" : "READY"}`;
      }
      await action.setState(state);
    }
    await action.setTitle(title);
  }

  private async runGitCodexAction(command: GitActionCommand, action: DisplayAction): Promise<void> {
    this.gitActionStates.set(action.id, "running");
    this.gitActionResults.delete(action.id);
    await this.renderAll();
    try {
      const workingDirectory = this.gitSnapshot.workspacePath ?? this.gitSnapshot.repositoryPath;
      if (!workingDirectory) throw new Error(this.gitSnapshot.error ?? "No Git repository is available.");
      const output = await this.gitAdapter.runCodex(command.slice(4) as CodexGitCommand, workingDirectory);
      this.gitActionStates.set(action.id, "ok");
      this.gitActionResults.set(action.id, summarizeGitResult(output));
      await action.showOk();
    } catch (error) {
      this.gitActionStates.set(action.id, "fail");
      this.gitActionResults.set(action.id, truncateForInfoBar(error instanceof Error ? error.message : "Codex failed", 18));
      await action.showAlert();
      console.warn(`Codex Git action failed: ${command}`, error instanceof Error ? error.message : "unknown error");
    }
    await this.renderAll();
    const previous = this.gitNoticeTimers.get(action.id);
    if (previous) clearTimeout(previous);
    const timer = setTimeout(() => {
      this.gitActionStates.set(action.id, "ready");
      this.gitActionResults.delete(action.id);
      this.gitNoticeTimers.delete(action.id);
      void this.renderAll();
    }, 4500);
    this.gitNoticeTimers.set(action.id, timer);
  }

  private async readGitWorkspaces(snapshot: CodexSnapshot): Promise<GitWorkspaceContext[]> {
    const observations = [...(snapshot.workspaces ?? [])];
    if (snapshot.activeThreadId && snapshot.workspacePath && !observations.some((observation) => observation.threadId === snapshot.activeThreadId)) {
      observations.unshift({
        threadId: snapshot.activeThreadId,
        status: snapshot.status === "offline" ? "idle" : snapshot.status,
        observedAt: snapshot.observedAt,
        workspacePath: snapshot.workspacePath,
      });
    }
    const unique = new Map<string, CodexWorkspace>();
    for (const observation of observations) {
      if (unique.has(observation.threadId)) continue;
      unique.set(observation.threadId, observation);
      if (unique.size >= maxGitFocusButtons) break;
    }
    return Promise.all([...unique.values()].map(async (observation) => ({
      observation,
      snapshot: await this.gitAdapter.snapshot(observation.workspacePath),
    })));
  }

  private selectGitWorkspace(command: GitFocusCommand): void {
    const context = this.gitWorkspaces[gitFocusIndex(command)];
    if (!context) return;
    this.selectedGitThreadId = context.observation.threadId;
    this.gitSnapshot = context.snapshot;
  }

  private async setImageIfChanged(action: DisplayAction, signature: string, image: string, state: number): Promise<void> {
    if (this.imageSignatures.get(action.id) === signature) return;
    await action.setImage(image, state);
    this.imageSignatures.set(action.id, signature);
  }

  private startCompletionPulse(): void {
    this.completionPulseUntil = Date.now() + 1800;
    this.completionPulsePhase = true;
    if (this.completionPulseTimer) clearInterval(this.completionPulseTimer);
    this.completionPulseTimer = setInterval(() => {
      if (Date.now() >= this.completionPulseUntil) {
        if (this.completionPulseTimer) clearInterval(this.completionPulseTimer);
        this.completionPulseTimer = undefined;
        this.completionPulsePhase = false;
      } else {
        this.completionPulsePhase = !this.completionPulsePhase;
      }
      void this.renderAll();
    }, 180);
    void this.renderAll();
  }
}

function summarizeGitResult(output: string): string {
  const line = output.split(/\r?\n/).map((value) => value.trim()).find(Boolean);
  return truncateForInfoBar(line || "DONE", 18);
}

function isGitCodexCommand(command: ControlCommand): command is GitActionCommand {
  return command === "git-diff" || command === "git-review" || command === "git-test" || command === "git-commit-prep";
}

function isGitFocusCommand(command: ControlCommand): command is GitFocusCommand {
  return command.startsWith("git-focus-");
}

function gitFocusIndex(command: GitFocusCommand): number {
  return Number.parseInt(command.slice("git-focus-".length), 10) - 1;
}

function gitActionLabel(command: GitActionCommand): string {
  switch (command) {
    case "git-diff": return "DIFF";
    case "git-review": return "REVIEW";
    case "git-test": return "TEST";
    case "git-commit-prep": return "COMMIT";
  }
}

let singleton: NeoController | undefined;
export function getNeoController(): NeoController {
  singleton ??= new NeoController();
  return singleton;
}
