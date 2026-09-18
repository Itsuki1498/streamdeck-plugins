export type GitState = "clean" | "dirty" | "conflict" | "detached" | "no-repo" | "error";

export type GitSnapshot = {
  state: GitState;
  workspacePath?: string;
  repositoryPath?: string;
  repositoryName?: string;
  branch?: string;
  modifiedFiles: number;
  stagedFiles: number;
  untrackedFiles: number;
  conflictFiles: number;
  ahead: number;
  behind: number;
  error?: string;
  observedAt: number;
};
