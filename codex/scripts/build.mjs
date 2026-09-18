import { rollup } from "rollup";
import config from "../config/rollup.config.mjs";

const bundle = await rollup(config);
try {
  await bundle.write(config.output);
  console.log("✔ Built the Codex Neo Deck bundle");
} finally {
  await bundle.close();
}

// @rollup/plugin-typescript can leave a macOS file watcher alive after close().
// The bundle and TypeScript program are already closed above, so end this build process cleanly.
process.exit(0);
