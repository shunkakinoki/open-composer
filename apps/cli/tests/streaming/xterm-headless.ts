/**
 * Headless xterm utilities for testing terminal streaming
 * Uses xterm.js without DOM/browser dependencies
 */

import type { ITerminalOptions, Terminal } from "@xterm/xterm";
import type { WebSocket } from "ws";

export interface HeadlessTerminalOptions extends Partial<ITerminalOptions> {
  cols?: number;
  rows?: number;
}

export interface HeadlessTerminal {
  terminal: Terminal;
  output: string[];
  write: (data: string) => void;
  resize: (cols: number, rows: number) => void;
  getOutput: () => string;
  getLines: () => string[];
  clear: () => void;
  dispose: () => void;
}

/**
 * Create a headless xterm terminal for testing
 * This creates a terminal instance that captures output without requiring a DOM
 */
export async function createHeadlessTerminal(
  options: HeadlessTerminalOptions = {},
): Promise<HeadlessTerminal> {
  const { Terminal } = await import("@xterm/xterm");

  const terminal = new Terminal({
    cols: options.cols ?? 80,
    rows: options.rows ?? 24,
    allowTransparency: false,
    ...options,
  });

  const output: string[] = [];

  // Capture terminal output
  terminal.onData((data) => {
    output.push(data);
  });

  // Helper to write data to terminal
  const write = (data: string) => {
    terminal.write(data);
  };

  // Helper to resize terminal
  const resize = (cols: number, rows: number) => {
    terminal.resize(cols, rows);
  };

  // Get all output as single string
  const getOutput = () => output.join("");

  // Get output as array of lines
  const getLines = () => {
    const buffer = terminal.buffer.active;
    const lines: string[] = [];
    for (let i = 0; i < buffer.length; i++) {
      const line = buffer.getLine(i);
      if (line) {
        lines.push(line.translateToString(true));
      }
    }
    return lines;
  };

  // Clear output history
  const clear = () => {
    output.length = 0;
    terminal.clear();
  };

  // Dispose terminal
  const dispose = () => {
    terminal.dispose();
  };

  return {
    terminal,
    output,
    write,
    resize,
    getOutput,
    getLines,
    clear,
    dispose,
  };
}

/**
 * Attach xterm terminal to WebSocket using addon-attach
 */
export async function attachTerminalToWebSocket(
  terminal: Terminal,
  ws: WebSocket,
): Promise<void> {
  const { AttachAddon } = await import("@xterm/addon-attach");

  // Create and load the attach addon
  const attachAddon = new AttachAddon(ws as never);
  terminal.loadAddon(attachAddon);

  // Wait for connection to be established
  return new Promise((resolve, reject) => {
    if (ws.readyState === 1) {
      // WebSocket.OPEN
      resolve();
    } else {
      ws.once("open", () => resolve());
      ws.once("error", reject);
    }
  });
}

/**
 * Create terminal with WebSocket streaming
 */
export async function createStreamingTerminal(
  wsUrl: string,
  options: HeadlessTerminalOptions = {},
): Promise<HeadlessTerminal> {
  const headlessTerminal = await createHeadlessTerminal(options);
  const { default: WebSocket } = await import("ws");

  const ws = new WebSocket(wsUrl);
  await attachTerminalToWebSocket(headlessTerminal.terminal, ws);

  // Override dispose to also close WebSocket
  const originalDispose = headlessTerminal.dispose;
  headlessTerminal.dispose = () => {
    ws.close();
    originalDispose();
  };

  return headlessTerminal;
}

/**
 * Wait for terminal to receive specific text
 */
export async function waitForText(
  terminal: HeadlessTerminal,
  expectedText: string,
  timeout = 5000,
): Promise<boolean> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      const output = terminal.getOutput();
      const lines = terminal.getLines().join("\n");

      if (output.includes(expectedText) || lines.includes(expectedText)) {
        clearInterval(checkInterval);
        resolve(true);
      }

      if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        resolve(false);
      }
    }, 50);
  });
}

/**
 * Wait for terminal buffer to contain specific number of lines
 */
export async function waitForLines(
  terminal: HeadlessTerminal,
  lineCount: number,
  timeout = 5000,
): Promise<boolean> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      const lines = terminal.getLines();

      if (lines.length >= lineCount) {
        clearInterval(checkInterval);
        resolve(true);
      }

      if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        resolve(false);
      }
    }, 50);
  });
}
