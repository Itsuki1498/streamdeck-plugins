type StreamDeckPayload = {
  controller?: string;
  settings?: Record<string, unknown>;
  [key: string]: unknown;
};

export type StreamDeckMessage = {
  event: string;
  action?: string;
  context?: string;
  payload?: StreamDeckPayload;
  [key: string]: unknown;
};

export type StreamDeckAction = {
  id: string;
  controller: string;
  setTitle(title?: string): Promise<void>;
  setImage(image?: string, state?: number): Promise<void>;
  setState(state: number): Promise<void>;
  showAlert(): Promise<void>;
  showOk(): Promise<void>;
  isKey(): boolean;
};

export type StreamDeckSettings = Record<string, unknown>;

type Listener = (message: StreamDeckMessage) => void;

const streamDeckOpen = 1;

export class StreamDeckRuntime {
  private readonly listeners = new Map<string, Set<Listener>>();
  private readonly actions = new Map<string, StreamDeckAction>();
  private socket?: WebSocket;

  on(event: string, listener: Listener): () => void {
    const listeners = this.listeners.get(event) ?? new Set<Listener>();
    listeners.add(listener);
    this.listeners.set(event, listeners);
    return () => listeners.delete(listener);
  }

  actionFor(message: StreamDeckMessage): StreamDeckAction {
    if (!message.context) throw new Error("Stream Deck event has no context");
    const existing = this.actions.get(message.context);
    if (existing) return existing;

    const controller = message.payload?.controller ?? "Keypad";
    const action: StreamDeckAction = {
      id: message.context,
      controller,
      setTitle: (title) => this.send({ event: "setTitle", context: message.context, payload: { title } }),
      setImage: (image, state) => this.send({
        event: "setImage",
        context: message.context,
        payload: { ...(image === undefined ? {} : { image }), ...(state === undefined ? {} : { state }) },
      }),
      setState: (state) => this.send({ event: "setState", context: message.context, payload: { state } }),
      showAlert: () => this.send({ event: "showAlert", context: message.context }),
      showOk: () => this.send({ event: "showOk", context: message.context }),
      isKey: () => controller === "Keypad",
    };
    this.actions.set(message.context, action);
    return action;
  }

  forgetAction(context: string | undefined): void {
    if (context) this.actions.delete(context);
  }

  connect(): void {
    const port = this.argument("-port");
    const pluginUUID = this.argument("-pluginUUID");
    const registerEvent = this.argument("-registerEvent");
    if (!port || !pluginUUID || !registerEvent) throw new Error("Missing Stream Deck registration arguments");

    const socket = new WebSocket(`ws://127.0.0.1:${port}`);
    this.socket = socket;
    socket.onopen = () => {
      void this.send({ event: registerEvent, uuid: pluginUUID });
    };
    socket.onmessage = (event) => {
      try {
        const data = typeof event.data === "string" ? event.data : String(event.data);
        const message = JSON.parse(data) as StreamDeckMessage;
        const listeners = this.listeners.get(message.event);
        if (!listeners) return;
        for (const listener of listeners) listener(message);
      } catch {
        // Stream Deck owns the socket lifecycle. Ignore malformed messages and keep the plugin alive.
      }
    };
  }

  private async send(command: Record<string, unknown>): Promise<void> {
    const socket = this.socket;
    if (!socket || socket.readyState !== streamDeckOpen) throw new Error("Stream Deck connection is not ready");
    socket.send(JSON.stringify(command));
  }

  private argument(name: string): string | undefined {
    const index = process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : undefined;
  }
}
