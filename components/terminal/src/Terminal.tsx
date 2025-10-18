import React, { useEffect, useState, useRef } from 'react';
import { Box, useInput, useFocus } from 'ink';
import { PtyManager, type PtyConfig } from './ptyManager.js';
import { AnsiText } from './AnsiText.js';
import type { AnsiOutput } from './terminalSerializer.js';

/**
 * Props for Terminal component
 */
export interface TerminalProps {
  /** Command to execute */
  command: string;
  /** Command arguments */
  args?: string[];
  /** Working directory */
  cwd?: string;
  /** Environment variables */
  env?: Record<string, string>;
  /** Terminal width in columns */
  cols?: number;
  /** Terminal height in rows */
  rows?: number;
  /** Enable interactive mode (allows user input) */
  interactive?: boolean;
  /** Whether this terminal is focused (for multiplexer use) */
  focused?: boolean;
  /** Callback when process exits */
  onExit?: (code: number, signal?: number) => void;
  /** Callback when data is received */
  onData?: (output: AnsiOutput) => void;
}

/**
 * Interactive Terminal component for Ink
 *
 * Renders an interactive terminal that:
 * - Spawns a PTY process
 * - Parses ANSI escape codes using @xterm/headless
 * - Renders styled output in Ink
 * - Supports interactive input when focused
 *
 * Implementation details:
 * - Uses node-pty to spawn and manage the process
 * - Uses @xterm/headless to parse ANSI codes (serializable)
 * - Streams output through a separate process
 * - Supports keyboard input in interactive mode
 *
 * @example
 * ```tsx
 * <Terminal
 *   command="bash"
 *   args={['-c', 'ls -la']}
 *   cols={80}
 *   rows={24}
 *   interactive={true}
 *   onExit={(code) => console.log('Exited with code:', code)}
 * />
 * ```
 */
export const Terminal: React.FC<TerminalProps> = ({
  command,
  args = [],
  cwd,
  env,
  cols = 80,
  rows = 24,
  interactive = false,
  focused,
  onExit,
  onData,
}) => {
  const [output, setOutput] = useState<AnsiOutput>([]);
  const [exited, setExited] = useState(false);
  const ptyManagerRef = useRef<PtyManager | null>(null);
  const { isFocused: inkFocused } = useFocus({ autoFocus: interactive && focused === undefined });

  // Use explicit focused prop if provided (for multiplexer), otherwise use Ink focus
  const isFocused = focused !== undefined ? focused : inkFocused;

  // Initialize PTY manager
  useEffect(() => {
    let mounted = true;

    const config: PtyConfig = {
      command,
      args,
      cwd,
      env,
      cols,
      rows,
    };

    if (process.env.DEBUG_TERM) {
      console.error(`[TERM] Mounting: ${command} ${args?.join(' ') || ''}, cols=${cols}, rows=${rows}`);
    }

    // Create PTY manager asynchronously
    PtyManager.create(config, (event) => {
      if (!mounted) return;

      if (event.type === 'data') {
        if (process.env.DEBUG_TERM) {
          console.error(`[TERM] Data: ${event.output.length} lines`);
        }
        setOutput(event.output);
        onData?.(event.output);
      } else if (event.type === 'exit') {
        if (process.env.DEBUG_TERM) {
          console.error(`[TERM] Exit: code=${event.code}`);
        }
        setExited(true);
        onExit?.(event.code, event.signal);
      }
    }).then((ptyManager) => {
      if (mounted) {
        ptyManagerRef.current = ptyManager;
      } else {
        // Component was unmounted before PTY was created
        ptyManager.dispose();
      }
    }).catch((error) => {
      console.error('Failed to create PTY manager:', error);
    });

    // Cleanup on unmount
    return () => {
      mounted = false;
      ptyManagerRef.current?.dispose();
    };
  }, [command, JSON.stringify(args), cwd, JSON.stringify(env), cols, rows]);

  // Handle terminal resize
  useEffect(() => {
    ptyManagerRef.current?.resize(cols, rows);
  }, [cols, rows]);

  // Handle keyboard input in interactive mode
  useInput(
    (input, key) => {
      if (!interactive || !isFocused || exited) return;

      const ptyManager = ptyManagerRef.current;
      if (!ptyManager) return;

      // Handle special keys
      if (key.return) {
        ptyManager.write('\r');
      } else if (key.backspace || key.delete) {
        ptyManager.write('\x7f');
      } else if (key.escape) {
        ptyManager.write('\x1b');
      } else if (key.tab) {
        ptyManager.write('\t');
      } else if (key.upArrow) {
        ptyManager.write('\x1b[A');
      } else if (key.downArrow) {
        ptyManager.write('\x1b[B');
      } else if (key.rightArrow) {
        ptyManager.write('\x1b[C');
      } else if (key.leftArrow) {
        ptyManager.write('\x1b[D');
      } else if (key.ctrl) {
        // Handle Ctrl+<key> combinations
        const ctrlMap: Record<string, string> = {
          'a': '\x01', 'b': '\x02', 'c': '\x03', 'd': '\x04',
          'e': '\x05', 'f': '\x06', 'g': '\x07', 'h': '\x08',
          'i': '\x09', 'j': '\x0a', 'k': '\x0b', 'l': '\x0c', // Ctrl+L = clear
          'm': '\x0d', 'n': '\x0e', 'o': '\x0f', 'p': '\x10',
          'q': '\x11', 'r': '\x12', 's': '\x13', 't': '\x14',
          'u': '\x15', 'v': '\x16', 'w': '\x17', 'x': '\x18',
          'y': '\x19', 'z': '\x1a', '[': '\x1b', '\\': '\x1c',
          ']': '\x1d', '^': '\x1e', '_': '\x1f',
        };
        const ctrlChar = ctrlMap[input.toLowerCase()];
        if (ctrlChar) {
          ptyManager.write(ctrlChar);
        }
      } else if (input) {
        // Regular character input
        ptyManager.write(input);
      }
    },
    { isActive: interactive && isFocused && !exited }
  );

  // Only add border and padding for interactive terminals
  // Non-interactive terminals are typically wrapped by parent components
  if (interactive) {
    return (
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={isFocused ? 'cyan' : 'gray'}
        paddingX={1}
      >
        <AnsiText output={output} width={cols} height={rows} />
      </Box>
    );
  }

  // Non-interactive: just render the output directly
  return <AnsiText output={output} width={cols} height={rows} />;
};
