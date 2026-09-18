import { copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";

const root = new URL("../", import.meta.url);
const rootPath = decodeURIComponent(root.pathname);
const pluginRoot = join(rootPath, "plugin");
const pluginDir = "com.itsuki.codex-neo-deck.sdPlugin";
const outputName = "com.itsuki.codex-neo-deck.streamDeckPlugin";
const outputDirectory = join(rootPath, "release");
const temporaryDirectory = await mkdtemp(join(tmpdir(), "codex-neo-pack-"));
const temporaryOutput = join(temporaryDirectory, outputName);

try {
  await mkdir(outputDirectory, { recursive: true });
  await new Promise((resolve, reject) => {
    const child = spawn("zip", [
      "-r",
      "-X",
      temporaryOutput,
      pluginDir,
      "-x",
      `${pluginDir}/bin/*.map`,
      `${pluginDir}/logs/`,
      `${pluginDir}/logs/*`,
    ], {
      cwd: pluginRoot,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`zip exited with ${code}`)));
  });
  await copyFile(temporaryOutput, join(outputDirectory, outputName));
  console.log(`✔ Packed ${outputName} with the Stream Deck 7.5.1-compatible keypad manifest`);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
