import { registerCodexActions } from "./codex-action.js";
import { StreamDeckRuntime } from "./streamdeck-runtime.js";

const runtime = new StreamDeckRuntime();
registerCodexActions(runtime);
runtime.connect();
