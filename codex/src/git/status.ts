import { execFile } from "node:child_process";
import { basename, relative } from "node:path";
import { promisify } from "node:util";
import type { GitSnapshot, GitState } from "./types.js";

const execFileAsync = promisify(execFile);
const gitTimeout = 4000;

type GitCounters = Pick<GitSnapshot, "modifiedFiles" | "stagedFiles" | "untrackedFiles" | "conflictFiles" | "ahead" | "behind">;

export function parseGitStatus(output: string, repositoryPath: string, workspacePath = repositoryPath, observedAt = Date.now()): GitSnapshot {
  let branch: string | undefined;
  let ahead = 0;
  let behind = 0;
  const paths = new Set<string>();
  let modifiedFiles = 0;
  let stagedFiles = 0;
  let untrackedFiles = 0;
  let conflictFiles = 0;

  for (const line of output.split(/\r?\n/).filter(Boolean)) {
    if (line.startsWith("# branch.head ")) {
      branch = line.slice("# branch.head ".length).trim();
      continue;
    }
    if (line.startsWith("# branch.ab ")) {
      const match = line.match(/# branch\.ab ([+-]\d+) ([+-]\d+)/);
      if (match) {
        ahead = Math.max(0, Number.parseInt(match[1], 10));
        behind = Math.max(0, Math.abs(Number.parseInt(match[2], 10)));
      }
      continue;
    }

    const kind = line[0];
    if (kind === "?") {
      untrackedFiles++;
      continue;
    }
    if (kind !== "1" && kind !== "2" && kind !== "u") continue;

    const path = line.slice(line.indexOf(" ", 2) + 1).split("\t").at(-1) ?? line;
    if (paths.has(path)) continue;
    paths.add(path);
    if (kind === "u") {
      conflictFiles++;
      modifiedFiles++;
      continue;
    }
    const xy = line.slice(2, 4);
    if (xy[0] !== ".") stagedFiles++;
    if (xy[1] !== ".") modifiedFiles++;
  }

  const detached = branch === "(detached)" || branch === "HEAD";
  const state: GitState = conflictFiles > 0
    ? "conflict"
    : detached
      ? "detached"
      : modifiedFiles || stagedFiles || untrackedFiles
        ? "dirty"
        : "clean";
  const counters: GitCounters = { modifiedFiles, stagedFiles, untrackedFiles, conflictFiles, ahead, behind };
  return {
    state,
    workspacePath,
    repositoryPath,
    repositoryName: basename(repositoryPath),
    ...(branch && !detached ? { branch } : {}),
    ...counters,
    observedAt,
  };
}

export async function readGitSnapshot(workspacePath: string | undefined, observedAt = Date.now()): Promise<GitSnapshot> {
  if (!workspacePath) return emptySnapshot("no-repo", "Codex workspace is not available", observedAt);
  try {
    const root = await runGit(workspacePath, ["rev-parse", "--show-toplevel"]);
    const repositoryPath = root.trim();
    const status = await runGit(repositoryPath, ["status", "--porcelain=v2", "--branch", "--untracked-files=all"]);
    return parseGitStatus(status, repositoryPath, workspacePath, observedAt);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Git is unavailable";
    if (/not a git repository/i.test(message)) return emptySnapshot("no-repo", "Not a Git repository", observedAt, workspacePath);
    return emptySnapshot("error", message, observedAt, workspacePath);
  }
}

function emptySnapshot(state: "no-repo" | "error", error: string, observedAt: number, workspacePath?: string): GitSnapshot {
  return { state, workspacePath, modifiedFiles: 0, stagedFiles: 0, untrackedFiles: 0, conflictFiles: 0, ahead: 0, behind: 0, error, observedAt };
}

async function runGit(cwd: string, args: string[]): Promise<string> {
  const result = await execFileAsync("git", ["-C", cwd, ...args], { timeout: gitTimeout, maxBuffer: 1024 * 1024 });
  return result.stdout;
}

export function gitStatusTitle(snapshot: GitSnapshot): string {
  if (snapshot.state === "no-repo") return "GIT\nNO REPO";
  if (snapshot.state === "error") return "GIT\nERROR";
  const repository = compactGitLabel(`${snapshot.repositoryName ?? "GIT"}/${gitWorkspaceScope(snapshot)}`);
  const branch = compactGitLabel(snapshot.branch ?? "DETACHED");
  if (snapshot.state === "conflict") return `${repository}\n${branch}\nCONFLICT ${snapshot.conflictFiles}`;
  if (snapshot.state === "clean") return `${repository}\n${branch}\nCLEAN ↑${snapshot.ahead} ↓${snapshot.behind}`;
  return `${repository}\n${branch}\nM${snapshot.modifiedFiles} S${snapshot.stagedFiles} U${snapshot.untrackedFiles}`;
}

function compactGitLabel(value: string, maxLength = 18): string {
  return value.length <= maxLength ? value : `…${value.slice(-(maxLength - 1))}`;
}

function gitWorkspaceScope(snapshot: GitSnapshot): string {
  if (!snapshot.repositoryPath || !snapshot.workspacePath) return "ROOT";
  const scope = relative(snapshot.repositoryPath, snapshot.workspacePath).replaceAll("\\", "/");
  return scope && scope !== "." ? scope : "ROOT";
}
