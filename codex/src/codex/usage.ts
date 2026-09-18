import type { UsageSnapshot, UsageWindow } from "./types.js";

export function classifyWindowMinutes(minutes: number): UsageWindow["kind"] {
  if (Math.abs(minutes - 300) <= 1) return "five-hour";
  if (Math.abs(minutes - 10080) <= 1) return "weekly";
  return "other";
}

export function normalizeUsageWindow(value: unknown): UsageWindow | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Record<string, unknown>;
  const usedPercent = Number(candidate.used_percent ?? candidate.usedPercent);
  const seconds = Number(candidate.limit_window_seconds ?? candidate.windowDurationSeconds);
  if (!Number.isFinite(usedPercent) || !Number.isFinite(seconds) || seconds <= 0) return undefined;
  const boundedUsed = Math.min(100, Math.max(0, usedPercent));
  const resetsAt = Number(candidate.reset_at ?? candidate.resetsAt);
  return {
    kind: classifyWindowMinutes(seconds / 60),
    usedPercent: boundedUsed,
    remainingPercent: 100 - boundedUsed,
    ...(Number.isFinite(resetsAt) ? { resetsAt: resetsAt < 100000000000 ? resetsAt * 1000 : resetsAt } : {}),
  };
}

export function usageFromWindows(windows: readonly UsageWindow[], observedAt: number): UsageSnapshot | undefined {
  const fiveHour = windows.find((window) => window.kind === "five-hour");
  const weekly = windows.find((window) => window.kind === "weekly");
  if (!fiveHour && !weekly) return undefined;
  return { ...(fiveHour ? { fiveHour } : {}), ...(weekly ? { weekly } : {}), observedAt };
}

export function formatPercent(value: number | undefined): string {
  return value === undefined ? "--" : `${Math.round(value)}%`;
}

export function formatResetTime(timestamp: number | undefined, now = Date.now()): string | undefined {
  if (!timestamp || !Number.isFinite(timestamp)) return undefined;
  const remainingMinutes = Math.max(0, Math.round((timestamp - now) / 60000));
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;
  return `${hours}:${minutes.toString().padStart(2, "0")}`;
}

export function formatResetCompact(timestamp: number | undefined, now = Date.now()): string | undefined {
  if (!timestamp || !Number.isFinite(timestamp)) return undefined;
  const remainingMinutes = Math.max(0, Math.round((timestamp - now) / 60000));
  if (remainingMinutes < 60) return `${remainingMinutes}m`;
  if (remainingMinutes < 1440) {
    const hours = Math.floor(remainingMinutes / 60);
    const minutes = remainingMinutes % 60;
    return `${hours}h${minutes ? `${minutes}m` : ""}`;
  }
  const days = Math.floor(remainingMinutes / 1440);
  const hours = Math.floor((remainingMinutes % 1440) / 60);
  return `${days}d${hours ? `${hours}h` : ""}`;
}
