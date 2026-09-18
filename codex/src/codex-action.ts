import { getNeoController, type ControlCommand } from "./neo/controller.js";
import { StreamDeckRuntime, type StreamDeckMessage } from "./streamdeck-runtime.js";

const commands = {
  "com.itsuki.codex-neo-deck.approve": "approve",
  "com.itsuki.codex-neo-deck.reject": "reject",
  "com.itsuki.codex-neo-deck.next": "next",
  "com.itsuki.codex-neo-deck.usage-five-hour": "usage-five-hour",
  "com.itsuki.codex-neo-deck.usage-weekly": "usage-weekly",
  "com.itsuki.codex-neo-deck.status": "status",
  "com.itsuki.codex-neo-deck.infobar": "infobar",
  "com.itsuki.codex-neo-deck.control": "infobar",
  "com.itsuki.codex-neo-deck.git-status": "git-status",
  "com.itsuki.codex-neo-deck.git-diff": "git-diff",
  "com.itsuki.codex-neo-deck.git-review": "git-review",
  "com.itsuki.codex-neo-deck.git-test": "git-test",
  "com.itsuki.codex-neo-deck.git-commit-prep": "git-commit-prep",
  "com.itsuki.codex-neo-deck.git-focus-1": "git-focus-1",
  "com.itsuki.codex-neo-deck.git-focus-2": "git-focus-2",
  "com.itsuki.codex-neo-deck.git-focus-3": "git-focus-3",
  "com.itsuki.codex-neo-deck.git-focus-4": "git-focus-4",
  "com.itsuki.codex-neo-deck.git-focus-5": "git-focus-5",
  "com.itsuki.codex-neo-deck.git-focus-6": "git-focus-6",
} satisfies Record<string, ControlCommand>;

function commandFor(message: StreamDeckMessage): ControlCommand | undefined {
  return message.action ? commands[message.action as keyof typeof commands] : undefined;
}

export function registerCodexActions(runtime: StreamDeckRuntime): void {
  const controller = getNeoController();

  runtime.on("willAppear", (message) => {
    const command = commandFor(message);
    if (!command) return;
    const action = runtime.actionFor(message);
    controller.register(action, command, message.payload?.controller ?? action.controller);
  });

  runtime.on("willDisappear", (message) => {
    controller.unregister({ id: message.context ?? "" });
    runtime.forgetAction(message.context);
  });

  runtime.on("keyDown", (message) => {
    const command = commandFor(message);
    if (!command) return;
    const action = runtime.actionFor(message);
    void controller.handleKey(command, action);
  });

}
