export type CodexStatus =
  | "approval"
  | "input"
  | "working"
  | "complete"
  | "idle"
  | "error";

export type ApprovalKind =
  | "shell"
  | "file-write"
  | "file-read"
  | "network"
  | "external-app"
  | "other";

export type ApprovalIdentity = {
  approvalId?: string;
  threadId: string;
  createdAt?: number;
  summaryHash?: string;
};

export type PendingApproval = ApprovalIdentity & {
  kind: ApprovalKind;
  summary: string;
  detail?: string;
};

export type UsageWindow = {
  kind: "five-hour" | "weekly" | "other";
  usedPercent: number;
  remainingPercent: number;
  resetsAt?: number;
};

export type UsageSnapshot = {
  fiveHour?: UsageWindow;
  weekly?: UsageWindow;
  observedAt: number;
};

export type CodexSlot = {
  id: number;
  threadKey?: string | null;
  status: CodexStatus;
  selected?: boolean;
};

export type CodexSnapshot = {
  connected: boolean;
  activeThreadId?: string;
  slots: CodexSlot[];
  approvals: PendingApproval[];
  status: CodexStatus | "offline";
  usage?: UsageSnapshot;
  observedAt: number;
};
