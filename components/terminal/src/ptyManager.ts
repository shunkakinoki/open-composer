import { spawn, type ChildProcess } from 'child_process';
import { Terminal } from '@xterm/headless';
import { serializeTerminalToObject, type AnsiOutput } from './terminalSerializer.js';
import { getPty, type PtyImplementation } from './getPty.js';

/**
 * Configuration for PTY process
 */
export interface PtyConfig {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  cols?: number;
  rows?: number;
  /** Use shell mode (default: false for PTY, true for child_process fallback) */
  shell?: boolean;
}

/**
 * Events emitted by PTY manager
 */
export type PtyEvent =
  | { type: 'data'; output: AnsiOutput }
  | { type: 'exit'; code: number; signal?: number };

/**
 * Manages a PTY or child process and headless terminal
 * Streams output through @xterm/headless for ANSI parsing
 *
 * Tries to use PTY (@lydell/node-pty or node-pty) for best compatibility,
 * falls back to child_process if PTY is unavailable.
 */
export class PtyManager {
  private ptyProcess: any = null;
  private childProcess: ChildProcess | null = null;
  private terminal: Terminal;
  private onEvent: (event: PtyEvent) => void;
  private updateTimeout: NodeJS.Timeout | null = null;
  private stdinWritable: boolean = false;
  private usePty: boolean = false;
  private ptyImpl: PtyImplementation = null;

  private constructor(
    config: PtyConfig,
    onEvent: (event: PtyEvent) => void,
    ptyImpl: PtyImplementation,
  ) {
    this.onEvent = onEvent;
    this.ptyImpl = ptyImpl;

    // Create headless terminal for ANSI parsing
    this.terminal = new Terminal({
      allowProposedApi: true,
      cols: config.cols || 80,
      rows: config.rows || 24,
    });

    // Spawn synchronously based on available implementation
    if (this.ptyImpl) {
      this.usePty = true;
      this.spawnPty(config);
    } else {
      this.usePty = false;
      this.spawnChildProcess(config);
    }
  }

  /**
   * Create a new PtyManager instance
   * This is async to allow PTY detection
   */
  static async create(
    config: PtyConfig,
    onEvent: (event: PtyEvent) => void,
  ): Promise<PtyManager> {
    const ptyImpl = await getPty();
    return new PtyManager(config, onEvent, ptyImpl);
  }

  /**
   * Spawn using PTY (if available)
   */
  private spawnPty(config: PtyConfig) {
    if (!this.ptyImpl) return;

    const { command, args = [], cwd, env, cols = 80, rows = 24 } = config;

    try {
      this.ptyProcess = this.ptyImpl.module.spawn(command, args, {
        name: 'xterm-256color',
        cols,
        rows,
        cwd: cwd || process.cwd(),
        env: {
          ...process.env,
          ...env,
          TERM: 'xterm-256color',
        },
      });

      this.stdinWritable = true;

      // Handle PTY data output
      this.ptyProcess.onData((data: string) => {
        // Debug: log received data
        if (process.env.DEBUG_PTY) {
          console.error('[PTY] Received data:', JSON.stringify(data.substring(0, 100)));
        }
        // Write data to headless terminal for ANSI parsing
        this.terminal.write(data, () => {
          if (process.env.DEBUG_PTY) {
            console.error('[PTY] Write complete, scheduling update');
          }
          this.scheduleUpdate();
        });
      });

      // Handle PTY exit
      this.ptyProcess.onExit(({ exitCode, signal }: { exitCode: number; signal?: number }) => {
        if (this.updateTimeout) {
          clearTimeout(this.updateTimeout);
        }
        this.emitOutput();
        this.onEvent({
          type: 'exit',
          code: exitCode,
          signal,
        });
      });

    } catch (error) {
      console.error('PTY spawn failed, falling back to child_process:', error);
      this.usePty = false;
      this.spawnChildProcess(config);
    }
  }

  /**
   * Spawn using child_process (fallback)
   */
  private spawnChildProcess(config: PtyConfig) {
    const { command, args = [], cwd, env, shell = false } = config;

    // Spawn child process
    this.childProcess = spawn(command, args, {
      cwd: cwd || process.cwd(),
      env: {
        ...process.env,
        ...env,
        TERM: 'xterm-256color',
        FORCE_COLOR: '1', // Enable colors in child process
      },
      shell,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.stdinWritable = this.childProcess.stdin !== null;

    // Handle stdout data
    if (this.childProcess.stdout) {
      this.childProcess.stdout.on('data', (data: Buffer) => {
        const text = data.toString('utf-8');
        // Debug: log received data
        if (process.env.DEBUG_PTY) {
          console.error('[CHILD_PROCESS] Received data:', JSON.stringify(text.substring(0, 100)));
        }
        // Write data to headless terminal for ANSI parsing
        this.terminal.write(text, () => {
          if (process.env.DEBUG_PTY) {
            console.error('[CHILD_PROCESS] Write complete, scheduling update');
          }
          // Debounce updates to avoid excessive rendering
          this.scheduleUpdate();
        });
      });
    }

    // Handle stderr data (combine with stdout)
    if (this.childProcess.stderr) {
      this.childProcess.stderr.on('data', (data: Buffer) => {
        const text = data.toString('utf-8');
        this.terminal.write(text, () => {
          this.scheduleUpdate();
        });
      });
    }

    // Handle process exit
    this.childProcess.on('exit', (code, signal) => {
      if (this.updateTimeout) {
        clearTimeout(this.updateTimeout);
      }
      // Send final update
      this.emitOutput();
      // Emit exit event
      this.onEvent({
        type: 'exit',
        code: code ?? 0,
        signal: signal ? parseInt(signal, 10) : undefined,
      });
    });

    // Handle process errors
    this.childProcess.on('error', (error) => {
      console.error('Process error:', error);
      this.onEvent({
        type: 'exit',
        code: 1,
      });
    });
  }

  /**
   * Schedule a debounced output update
   * This prevents excessive rendering when data comes in quickly
   */
  private scheduleUpdate() {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    this.updateTimeout = setTimeout(() => {
      this.emitOutput();
      this.updateTimeout = null;
    }, 16); // ~60fps
  }

  /**
   * Emit current terminal output
   */
  private emitOutput() {
    const output = serializeTerminalToObject(this.terminal);
    this.onEvent({
      type: 'data',
      output,
    });
  }

  /**
   * Write data to process stdin (for interactive mode)
   */
  write(data: string) {
    if (this.usePty && this.ptyProcess && this.stdinWritable) {
      try {
        this.ptyProcess.write(data);
      } catch (error) {
        console.error('Error writing to PTY:', error);
      }
    } else if (this.childProcess && this.childProcess.stdin && this.stdinWritable) {
      try {
        this.childProcess.stdin.write(data);
      } catch (error) {
        console.error('Error writing to stdin:', error);
      }
    }
  }

  /**
   * Resize the terminal
   */
  resize(cols: number, rows: number) {
    if (this.usePty && this.ptyProcess && this.ptyProcess.resize) {
      try {
        this.ptyProcess.resize(cols, rows);
      } catch (error) {
        console.error('Error resizing PTY:', error);
      }
    }
    this.terminal.resize(cols, rows);
  }

  /**
   * Kill the process
   */
  kill(signal?: string) {
    if (this.usePty && this.ptyProcess) {
      this.ptyProcess.kill(signal);
    } else if (this.childProcess) {
      this.childProcess.kill(signal as NodeJS.Signals);
    }
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
  }

  /**
   * Cleanup resources
   */
  dispose() {
    this.kill();
    this.terminal.dispose();
  }

  /**
   * Get the process ID
   */
  get pid(): number | undefined {
    if (this.usePty && this.ptyProcess) {
      return this.ptyProcess.pid;
    }
    return this.childProcess?.pid;
  }
}
