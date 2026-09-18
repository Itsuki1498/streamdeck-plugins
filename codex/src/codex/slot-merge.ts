import type { LocalThreadObservation } from "./local-status.js";
import type { CodexSlot } from "./types.js";

function canonicalThreadId(threadKey: string): string {
  return threadKey.replace(/^local:/, "");
}

export function mergeLocalSlots(slots: readonly CodexSlot[], observations: readonly LocalThreadObservation[]): CodexSlot[] {
  const merged = slots.map((slot) => ({ ...slot }));
  const localByThread = new Map(observations.map((observation) => [canonicalThreadId(observation.threadId), observation]));

  // A renderer slot can lag behind the rollout file by one poll. Promote only
  // an idle slot with the same thread identity; never replace approval/error.
  for (const slot of merged) {
    const observation = slot.threadKey ? localByThread.get(canonicalThreadId(slot.threadKey)) : undefined;
    const promotesLiveWork = slot.status === "idle" && observation && observation.status !== "idle" && observation.status !== "complete";
    const promotesCompletion = slot.status === "working" && observation?.status === "complete";
    if (promotesLiveWork || promotesCompletion) {
      slot.status = observation.status;
    }
  }

  const knownThreadIds = new Set(merged.map((slot) => slot.threadKey).filter((thread): thread is string => Boolean(thread)).map(canonicalThreadId));
  // The renderer is the authoritative aggregate when it already exposes two
  // or more distinct working tasks. Local rollout files are only a fallback
  // for the one-slot/zero-slot lag case, where they add missing work.
  const rendererHasEnoughWorkingTasks = merged.filter((slot) => slot.status === "working").length >= 2;
  for (const observation of observations) {
    if (observation.status === "idle" || observation.status === "complete") continue;
    const threadId = canonicalThreadId(observation.threadId);
    if (knownThreadIds.has(threadId)) continue;
    if (rendererHasEnoughWorkingTasks) continue;
    merged.push({ id: 1000 + merged.length, threadKey: observation.threadId, status: observation.status });
    knownThreadIds.add(threadId);
  }
  return merged;
}
