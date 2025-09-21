// Custom implementation based on: https://github.com/vadimdemedes/ink-testing-library/blob/master/source/index.ts
// License: MIT
// Note: This is not a direct copy. The code has been adapted and modified for project-specific testing needs.

import { EventEmitter } from "node:events";
import { type Instance as InkInstance, render as inkRender } from "ink";
import type { ReactElement } from "react";

// Minimal interfaces for testing
interface TestWritable {
  write(chunk: string): void;
  end(): void;
}

interface TestReadable {
  write(chunk: string): void;
  setEncoding(encoding: BufferEncoding): this;
  setRawMode(mode: boolean): void;
  read(): string | null;
  ref(): this;
  unref(): this;
}

class Stdout extends EventEmitter implements TestWritable {
  get columns() {
    return 100;
  }

  readonly frames: string[] = [];
  private _lastFrame?: string;

  write(chunk: string): void {
    this.frames.push(chunk);
    this._lastFrame = chunk;
  }

  end(): void {
    // Do nothing for testing
  }

  lastFrame = () => this._lastFrame;
}

class Stderr extends EventEmitter implements TestWritable {
  readonly frames: string[] = [];
  private _lastFrame?: string;

  write(chunk: string): void {
    this.frames.push(chunk);
    this._lastFrame = chunk;
  }

  end(): void {
    // Do nothing for testing
  }

  lastFrame = () => this._lastFrame;
}

class Stdin extends EventEmitter implements TestReadable {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  isTTY = true;
  private data: string = "";

  constructor(options: { isTTY?: boolean } = {}) {
    super();
    this.isTTY = options.isTTY ?? true;
  }

  write(chunk: string): void {
    this.data += chunk;
  }

  setEncoding(_encoding: BufferEncoding): this {
    return this;
  }

  setRawMode(_mode: boolean): void {
    // Do nothing
  }

  read(): string | null {
    if (this.data) {
      const result = this.data;
      this.data = "";
      return result;
    }
    return null;
  }

  ref(): this {
    return this;
  }

  unref(): this {
    return this;
  }
}

type Instance = {
  rerender: (tree: ReactElement) => void;
  unmount: () => void;
  cleanup: () => void;
  stdout: Stdout;
  stderr: Stderr;
  stdin: Stdin;
  frames: string[];
  lastFrame: () => string | undefined;
};

const instances: InkInstance[] = [];

export const render = (tree: ReactElement): Instance => {
  const stdout = new Stdout();
  const stderr = new Stderr();
  const stdin = new Stdin();

  const instance = inkRender(tree, {
    stdout: stdout as unknown as NodeJS.WriteStream,
    stderr: stderr as unknown as NodeJS.WriteStream,
    stdin: stdin as unknown as NodeJS.ReadStream,
    debug: true,
    exitOnCtrlC: false,
    patchConsole: false,
  });

  instances.push(instance);

  return {
    rerender: instance.rerender,
    unmount: instance.unmount,
    cleanup: instance.cleanup,
    stdout,
    stderr,
    stdin,
    frames: stdout.frames,
    lastFrame: stdout.lastFrame,
  };
};
export const cleanup = () => {
  for (const instance of instances) {
    instance.unmount();
    instance.cleanup();
  }
  instances.length = 0;
};
  instances.length = 0;
  instances.length = 0;
};
