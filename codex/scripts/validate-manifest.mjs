import { readFile } from "node:fs/promises";
import { access } from "node:fs/promises";
const root = new URL("../plugin/com.itsuki.codex-neo-deck.sdPlugin/", import.meta.url);
const readJson = async (name) => JSON.parse(await readFile(new URL(name, root), "utf8"));
const manifest = await readJson("manifest.json");

const failures = [];
const requireValue = (condition, message) => {
  if (!condition) failures.push(message);
};

requireValue(manifest.UUID === "com.itsuki.codex-neo-deck", "manifest UUID is incorrect");
requireValue(manifest.Software?.MinimumVersion === "7.5", "Stream Deck minimum version must support the current stable release");
requireValue(manifest.OS?.length === 1 && manifest.OS[0]?.Platform === "mac", "plugin must target macOS only");
requireValue(manifest.ApplicationsToMonitor?.mac?.includes("com.openai.codex"), "Codex application monitoring is missing");
const expectedActions = [
  ["approve", "Keypad"],
  ["reject", "Keypad"],
  ["answer", "Keypad"],
  ["next", "Keypad"],
  ["usage-five-hour", "Keypad"],
  ["usage-weekly", "Keypad"],
  ["status", "Keypad"],
  ["git-status", "Keypad"],
  ["git-focus-1", "Keypad"],
  ["git-focus-2", "Keypad"],
  ["git-focus-3", "Keypad"],
  ["git-focus-4", "Keypad"],
  ["git-focus-5", "Keypad"],
  ["git-focus-6", "Keypad"],
  ["git-diff", "Keypad"],
  ["git-review", "Keypad"],
  ["git-test", "Keypad"],
  ["git-commit-prep", "Keypad"],
];
const visibleActions = manifest.Actions?.filter((candidate) => candidate.VisibleInActionsList !== false) ?? [];
requireValue(visibleActions.length === expectedActions.length, "manifest must expose the expected dedicated keypad actions");
for (const [name, controller] of expectedActions) {
  const action = manifest.Actions?.find((candidate) => candidate.UUID === `com.itsuki.codex-neo-deck.${name}`);
  requireValue(Boolean(action), `missing action: ${name}`);
  requireValue(action?.Controllers?.length === 1 && action.Controllers[0] === controller, `${name} must target ${controller}`);
  requireValue(typeof action?.Icon === "string" && action.Icon.startsWith("static/imgs/actions/"), `${name} icon is missing`);
  requireValue(action?.States?.length >= 1, `${name} state image is missing`);
  if (controller === "Keypad" && name !== "status" && name !== "usage-five-hour" && name !== "usage-weekly") requireValue(action?.UserTitleEnabled === false, `${name} must be icon-only`);
  if (["approve", "reject", "answer", "status", "git-status", "git-focus-1", "git-focus-2", "git-focus-3", "git-focus-4", "git-focus-5", "git-focus-6", "git-diff", "git-review", "git-test", "git-commit-prep"].includes(name)) requireValue(action?.DisableAutomaticStates === true, `${name} state must be runtime-controlled`);
  if (name === "status") requireValue(action?.States?.length === 2 && action?.DisableAutomaticStates === true, "status must expose two runtime-controlled states");
  requireValue((action?.States?.length ?? 0) <= 2, `${name} must expose at most two native image states`);
}
const legacyAction = manifest.Actions?.find((candidate) => candidate.UUID === "com.itsuki.codex-neo-deck.control");
requireValue(legacyAction?.VisibleInActionsList === false, "legacy action must stay hidden from new configurations");
requireValue(legacyAction?.Controllers?.length === 1 && legacyAction.Controllers[0] === "Keypad", "legacy action must remain installable on Stream Deck 7.5.1");

for (const path of [
  "bin/plugin.js",
  "static/imgs/plugin.png",
  "static/imgs/plugin@2x.png",
  "static/imgs/category.png",
  "static/imgs/category@2x.png",
]) {
  try {
    await access(new URL(path, root));
  } catch {
    failures.push(`missing plugin asset: ${path}`);
  }
}

for (const [name] of expectedActions) {
  for (const prefix of [`static/imgs/actions/${name}`, `static/imgs/states/${name}`]) {
    for (const suffix of [".png", "@2x.png"]) {
      try {
        await access(new URL(`${prefix}${suffix}`, root));
      } catch {
        failures.push(`missing icon asset: ${prefix}${suffix}`);
      }
    }
  }
}
for (const name of ["status-offline", "status-approval", "status-input", "status-working", "status-error", "status-ready"]) {
  for (const suffix of [".png", "@2x.png"]) {
    try {
      await access(new URL(`static/imgs/states/${name}${suffix}`, root));
    } catch {
      failures.push(`missing status icon: static/imgs/states/${name}${suffix}`);
    }
  }
}
for (const name of ["status-offline-v2", "status-approval-v2", "status-input-v2", "status-working-v2", "status-error-v2", "status-ready-v2"]) {
  for (const suffix of [".png", "@2x.png"]) {
    try {
      await access(new URL(`static/imgs/states/${name}${suffix}`, root));
    } catch {
      failures.push(`missing refreshed status icon: static/imgs/states/${name}${suffix}`);
    }
  }
}
for (const name of ["approve-attention", "reject-attention", "answer-attention"]) {
  for (const suffix of [".png", "@2x.png"]) {
    try {
      await access(new URL(`static/imgs/states/${name}${suffix}`, root));
    } catch {
      failures.push(`missing attention icon asset: static/imgs/states/${name}${suffix}`);
    }
  }
}
for (const name of ["next-highlight"]) {
  for (const suffix of [".png", "@2x.png"]) {
    try {
      await access(new URL(`static/imgs/states/${name}${suffix}`, root));
    } catch {
      failures.push(`missing action state asset: static/imgs/states/${name}${suffix}`);
    }
  }
}

if (failures.length) {
  console.error(failures.map((failure) => `✖ ${failure}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log("✔ Codex Neo manifest and assets are valid");
}
