import type { CodexSnapshot, PendingApproval, PendingQuestion } from "./types.js";

export type ApprovalQueueState = {
  approvals: PendingApproval[];
  selectedIndex: number;
};

export function approvalIdentityKey(approval: PendingApproval): string {
  return [approval.approvalId ?? "", approval.threadId, approval.createdAt ?? "", approval.summaryHash ?? ""].join("|");
}

export function reconcileApprovalQueue(
  previous: ApprovalQueueState,
  approvals: readonly PendingApproval[],
): ApprovalQueueState {
  const previousSelected = previous.approvals[previous.selectedIndex];
  const selectedKey = previousSelected ? approvalIdentityKey(previousSelected) : undefined;
  const nextApprovals = [...approvals];
  const preservedIndex = selectedKey
    ? nextApprovals.findIndex((approval) => approvalIdentityKey(approval) === selectedKey)
    : -1;
  const fallbackIndex = Math.min(previous.selectedIndex, Math.max(0, nextApprovals.length - 1));
  return {
    approvals: nextApprovals,
    selectedIndex: nextApprovals.length === 0 ? 0 : preservedIndex >= 0 ? preservedIndex : fallbackIndex,
  };
}

export function selectNextApproval(state: ApprovalQueueState): ApprovalQueueState {
  if (state.approvals.length === 0) return { ...state, selectedIndex: 0 };
  return { ...state, selectedIndex: (state.selectedIndex + 1) % state.approvals.length };
}

export function removeApproval(state: ApprovalQueueState, identity: PendingApproval): ApprovalQueueState {
  const index = state.approvals.findIndex((approval) => approvalIdentityKey(approval) === approvalIdentityKey(identity));
  if (index < 0) return state;
  const approvals = state.approvals.filter((_, candidateIndex) => candidateIndex !== index);
  return {
    approvals,
    selectedIndex: approvals.length === 0 ? 0 : Math.min(state.selectedIndex, approvals.length - 1),
  };
}

export function isApprovalActionSafe(snapshot: CodexSnapshot, approval: PendingApproval): boolean {
  const current = snapshot.approvals.find((candidate) => approvalIdentityKey(candidate) === approvalIdentityKey(approval));
  const slot = snapshot.slots.find((candidate) => candidate.threadKey === approval.threadId);
  return Boolean(
    snapshot.connected &&
      current?.summaryHash &&
      slot?.status === "approval" &&
      snapshot.activeThreadId === approval.threadId &&
      current.summaryHash === approval.summaryHash,
  );
}

export function questionIdentityKey(question: PendingQuestion): string {
  return [question.questionId ?? "", question.threadId, question.summaryHash ?? ""].join("|");
}

export function isQuestionActionSafe(snapshot: CodexSnapshot, question: PendingQuestion): boolean {
  const current = snapshot.questions.find((candidate) => questionIdentityKey(candidate) === questionIdentityKey(question));
  const slot = snapshot.slots.find((candidate) => candidate.threadKey === question.threadId);
  return Boolean(
    snapshot.connected &&
      current &&
      slot?.status === "input" &&
      snapshot.activeThreadId === question.threadId,
  );
}
