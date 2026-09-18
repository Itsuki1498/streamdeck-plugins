import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readGitSnapshot } from "./status.js";
import type { GitSnapshot } from "./types.js";

const execFileAsync = promisify(execFile);

export type CodexGitCommand = "diff" | "review" | "test" | "commit-prep";

const prompts: Record<CodexGitCommand, string> = {
  diff: "現在のGit差分を確認して、変更内容を簡潔に説明してください。commitやpushは実行しないでください。",
  review: "現在のGit差分をレビューしてください。バグ、regression、secret、不要な変更、testへの影響を確認してください。問題と重要度を簡潔に報告してください。commitやpushは実行しないでください。",
  test: "現在のGit差分を確認し、読み取り専用で実行可能なtest・lint・buildチェックを判断して実行してください。結果を簡潔に報告してください。ファイル変更、commit、pushは実行しないでください。",
  "commit-prep": "現在のGit差分を確認し、対象ファイルと適切なcommit messageを生成してください。Conventional Commits形式を優先してください。commitやpushは実行しないでください。",
};

export class GitAdapter {
  snapshot(workspacePath: string | undefined): Promise<GitSnapshot> {
    return readGitSnapshot(workspacePath);
  }

  async runCodex(command: CodexGitCommand, repositoryPath: string): Promise<string> {
    const result = await execFileAsync("codex", [
      "exec",
      "-C", repositoryPath,
      "--sandbox", "read-only",
      "--ephemeral",
      "--color", "never",
      prompts[command],
    ], { timeout: 120_000, maxBuffer: 2 * 1024 * 1024 });
    return `${result.stdout}${result.stderr}`.trim();
  }
}
