import { render as inkRender } from "ink";
import type { ReactElement } from "react";
import { EventEmitter } from "node:events";

/**
 * Minimal writable stream for capturing Ink output
 */
class CaptureStream extends EventEmitter {
  private output = "";

  write(chunk: string): void {
    this.output += chunk;
  }

  getOutput(): string {
    return this.output;
  }

  end(): void {
    // no-op
  }
}

/**
 * Renders a React component to a string using Ink
 * Useful for rendering UI components in Effect CLI commands
 */
export function renderToString(element: ReactElement): string {
  const stdout = new CaptureStream();
  const stderr = new CaptureStream();

  const instance = inkRender(element, {
    stdout: stdout as unknown as NodeJS.WriteStream,
    stderr: stderr as unknown as NodeJS.WriteStream,
    debug: false,
    exitOnCtrlC: false,
    patchConsole: false,
  });

  // Wait for a tick to let Ink render
  const output = stdout.getOutput();

  // Clean up
  instance.unmount();
  instance.cleanup();

  return output;
}
