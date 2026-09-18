import { CodexAdapter } from "../codex/adapter.js";
import { reconcileApprovalQueue, selectNextApproval, type ApprovalQueueState } from "../codex/queue.js";
import { actionKeyState, completedWorkingTaskCount, statusKeyState, workingTaskCount } from "../codex/status.js";
import type { CodexSnapshot } from "../codex/types.js";
import type { StreamDeckAction } from "../streamdeck-runtime.js";
import { renderApprovalInfoBar, renderInfoBar, type ControllerNotice } from "./render.js";
import { renderStatusImage, renderUsageImage } from "./usage-image.js";

export type ControlCommand = "approve" | "reject" | "next" | "usage-five-hour" | "usage-weekly" | "status" | "infobar";

type DisplayAction = StreamDeckAction;
type RegisteredAction = { action: DisplayAction; command: ControlCommand; controller: string };

export class NeoController {
  private readonly adapter = new CodexAdapter();
  private readonly actions = new Map<string, RegisteredAction>();
  private readonly imageSignatures = new Map<string, string>();
  private queue: ApprovalQueueState = { approvals: [], selectedIndex: 0 };
  private snapshot: CodexSnapshot = { connected: false, slots: [], approvals: [], status: "offline", observedAt: 0 };
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
    this.adapter.close();
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
        case "usage-five-hour":
        case "usage-weekly":
        case "status":
        case "infobar":
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
      this.queue = reconcileApprovalQueue(this.queue, next.approvals);
      this.notice = "";
    } catch {
      // Never keep approval data actionable after a bridge failure.
      this.snapshot = { connected: false, slots: [], approvals: [], status: "offline", observedAt: Date.now() };
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
    const title = controller === "Neo"
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
      } else if (command === "usage-five-hour" || command === "usage-weekly") {
        const kind = command === "usage-five-hour" ? "five-hour" : "weekly";
        const window = kind === "five-hour" ? this.snapshot.usage?.fiveHour : this.snapshot.usage?.weekly;
        const remaining = window ? Math.round(window.remainingPercent) : "none";
        const now = Date.now();
        const reset = window?.resetsAt ? Math.max(0, Math.round((window.resetsAt - now) / 60000)) : "none";
        await this.setImageIfChanged(action, `usage:${kind}:${remaining}:${reset}`, renderUsageImage(window, kind, now), 0);
      } else if (command === "approve" || command === "reject" || command === "next") {
        state = actionKeyState(command, this.snapshot, this.queue.approvals.length);
      }
      await action.setState(state);
    }
    await action.setTitle(title);
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

let singleton: NeoController | undefined;
export function getNeoController(): NeoController {
  singleton ??= new NeoController();
  return singleton;
}
