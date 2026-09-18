import { CodexConnection } from "./connection.js";
import { approvalIdentityKey, isApprovalActionSafe } from "./queue.js";
import type { CodexSnapshot, PendingApproval } from "./types.js";

export class CodexAdapter {
  private readonly connection: CodexConnection;

  constructor(connection = new CodexConnection()) {
    this.connection = connection;
  }

  snapshot(): Promise<CodexSnapshot> {
    return this.connection.snapshot();
  }

  close(): void {
    this.connection.close();
  }

  async decide(approval: PendingApproval, decision: "approve" | "reject"): Promise<void> {
    const before = await this.connection.snapshot();
    // A missing identity, stale renderer, background thread, or changed request is unsafe.
    if (!isApprovalActionSafe(before, approval)) {
      throw new Error("Approval changed or cannot be identified safely.");
    }

    await this.connection.dispatchApproval(decision);
    const deadline = Date.now() + 3500;
    while (Date.now() < deadline) {
      await wait(250);
      const after = await this.connection.snapshot();
      const remaining = after.approvals.find((candidate) => candidate.threadId === approval.threadId);
      if (remaining && approvalIdentityKey(remaining) !== approvalIdentityKey(approval)) {
        throw new Error("Approval identity changed while the decision was being verified.");
      }
      const slotStatus = after.slots.find((candidate) => candidate.threadKey === approval.threadId)?.status;
      if (!remaining && slotStatus !== "approval") return;
      if (remaining && slotStatus !== "approval") return;
    }
    throw new Error(`${decision === "approve" ? "Approve" : "Reject"} failed; request is still pending.`);
  }
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
