/**
 * Terminal Multiplexer Component
 * A tmux-like terminal multiplexer for Ink
 * Based on stmux design
 */

import React, { useState, useEffect } from 'react';
import { Box, useInput, useApp, Text, useStdout } from 'ink';
import { Terminal } from '@open-composer/terminal';
import type { Layout, Pane, Split } from './types.js';

export interface MultiplexerProps {
  /** Layout configuration */
  layout: Layout;
  /** Terminal width (defaults to full terminal width) */
  width?: number;
  /** Terminal height (defaults to full terminal height) */
  height?: number;
  /** Show help text */
  showHelp?: boolean;
  /** Show pane borders (default: false for tmux-like appearance) */
  showBorders?: boolean;
  /** Prefix key for commands (default: 'b' for Ctrl+B) */
  prefixKey?: string;
  /** Enter full screen mode (uses alternate screen buffer, no scrolling) */
  enterFullScreen?: boolean;
}

/**
 * Parse size specification for flexbox
 */
function parseFlexSize(size: string | number | undefined, totalSize: number): number {
  if (size === undefined) return 1; // Auto size (flex: 1)

  if (typeof size === 'number') {
    return Math.max(3, Math.min(size, totalSize));
  }

  // Percentage: "50%"
  const percentMatch = size.match(/^(\d+)%$/);
  if (percentMatch && percentMatch[1]) {
    const percent = parseInt(percentMatch[1], 10);
    return Math.floor(totalSize * (percent / 100));
  }

  // Fraction: "1/2"
  const fractionMatch = size.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch && fractionMatch[1] && fractionMatch[2]) {
    const numerator = parseInt(fractionMatch[1], 10);
    const denominator = parseInt(fractionMatch[2], 10);
    return Math.floor(totalSize * (numerator / denominator));
  }

  return 1; // Default to flex: 1
}

/**
 * Get all panes from layout tree
 */
function getAllPanes(layout: Layout): Pane[] {
  const panes: Pane[] = [];

  function traverse(node: Layout) {
    if (node.type === 'pane') {
      panes.push(node);
    } else {
      node.children.forEach(traverse);
    }
  }

  traverse(layout);
  return panes;
}

/**
 * Terminal Multiplexer Component
 *
 * A tmux-like terminal multiplexer for Ink with clean pane appearance,
 * prefix-based key bindings, and full-screen support using alternate screen buffer.
 *
 * Key bindings (prefix key defaults to Ctrl+B):
 * - Ctrl+B, ?: Show help modal with all key bindings
 * - Ctrl+B, n/o: Navigate to next pane
 * - Ctrl+B, p: Navigate to previous pane
 * - Ctrl+B, →/↓: Navigate to next pane (arrow keys)
 * - Ctrl+B, ←/↑: Navigate to previous pane (arrow keys)
 * - Ctrl+B, d/x: Exit multiplexer
 * - Ctrl+C (twice): Safe exit - press twice within 1 second
 * - Ctrl+Q: Quick exit (no prefix needed)
 *
 * Full Screen Mode:
 * When `enterFullScreen={true}`, the multiplexer uses the terminal's alternate
 * screen buffer (like real tmux). This means:
 * - No scrolling with previous terminal history
 * - Clean exit returns to previous screen state
 * - True full-screen experience
 *
 * @example
 * ```tsx
 * const layout: Layout = {
 *   type: 'split',
 *   id: 'root',
 *   direction: 'horizontal',
 *   children: [
 *     { type: 'pane', id: 'left', command: 'bash', args: ['-i'], focus: true },
 *     { type: 'pane', id: 'right', command: 'htop' }
 *   ]
 * };
 *
 * // Full screen tmux-like mode (uses alternate screen buffer, no scrolling)
 * render(<Multiplexer layout={layout} enterFullScreen={true} />, {
 *   patchConsole: false,
 *   exitOnCtrlC: false,
 * });
 *
 * // Custom size with borders
 * <Multiplexer layout={layout} width={100} height={30} showBorders={true} />
 * ```
 */
export const Multiplexer: React.FC<MultiplexerProps> = ({
  layout,
  width: propWidth,
  height: propHeight,
  showHelp = true,
  showBorders = false,
  prefixKey = 'b',
  enterFullScreen = false,
}) => {
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Get terminal dimensions (full screen by default)
  const terminalWidth = stdout?.columns ?? 100;
  const terminalHeight = stdout?.rows ?? 30;

  const width = enterFullScreen ? terminalWidth : (propWidth ?? terminalWidth);
  // When in full screen mode, reduce height slightly to prevent overflow
  const height = enterFullScreen
    ? (showHelp ? terminalHeight - 1 : terminalHeight)
    : (propHeight ?? terminalHeight);

  // Get all panes for focus management
  const allPanes = getAllPanes(layout);
  const initialFocusIndex = allPanes.findIndex(p => p.focus === true);

  // Focus management
  const [focusedId, setFocusedId] = useState<string>(() => {
    if (initialFocusIndex >= 0) {
      const pane = allPanes[initialFocusIndex];
      return pane ? pane.id : (allPanes[0]?.id ?? '');
    }
    return allPanes[0]?.id ?? '';
  });
  const [exitedPanes, setExitedPanes] = useState<Set<string>>(new Set());

  // Prefix key mode and help modal
  const [prefixMode, setPrefixMode] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Ctrl+C tracking for double-press exit
  const [ctrlCPressed, setCtrlCPressed] = useState(false);

  // Reset Ctrl+C after timeout
  useEffect(() => {
    if (ctrlCPressed) {
      const timer = setTimeout(() => {
        setCtrlCPressed(false);
      }, 1000); // 1 second to press Ctrl+C again
      return () => clearTimeout(timer);
    }
  }, [ctrlCPressed]);

  // Enter alternate screen buffer for true full screen mode (like tmux)
  useEffect(() => {
    if (enterFullScreen && stdout) {
      // Enter alternate screen buffer
      stdout.write('\x1b[?1049h');
      // Hide cursor
      stdout.write('\x1b[?25l');

      return () => {
        // Show cursor
        stdout.write('\x1b[?25h');
        // Exit alternate screen buffer
        stdout.write('\x1b[?1049l');
      };
    }
  }, [enterFullScreen, stdout]);

  // Handle keyboard navigation (only if stdin supports it)
  useInput((input, key) => {
    // Handle Ctrl+C double-press for exit
    if (key.ctrl && input === 'c') {
      if (ctrlCPressed) {
        // Second press - exit
        exit();
        return;
      } else {
        // First press - set flag
        setCtrlCPressed(true);
        return;
      }
    }

    // Close help modal if it's open
    if (showHelpModal) {
      setShowHelpModal(false);
      return;
    }

    // Handle prefix mode
    if (prefixMode) {
      setPrefixMode(false);

      // Show help on '?'
      if (input === '?') {
        setShowHelpModal(true);
        return;
      }

      // Navigate to next pane on 'n' or 'o'
      if (input === 'n' || input === 'o') {
        const currentIndex = allPanes.findIndex(p => p.id === focusedId);
        const nextIndex = (currentIndex + 1) % allPanes.length;
        const nextPane = allPanes[nextIndex];
        if (nextPane) setFocusedId(nextPane.id);
        return;
      }

      // Navigate to previous pane on 'p'
      if (input === 'p') {
        const currentIndex = allPanes.findIndex(p => p.id === focusedId);
        const prevIndex = (currentIndex - 1 + allPanes.length) % allPanes.length;
        const prevPane = allPanes[prevIndex];
        if (prevPane) setFocusedId(prevPane.id);
        return;
      }

      // Exit on 'd' or 'x'
      if (input === 'd' || input === 'x') {
        exit();
        return;
      }

      // Arrow keys for navigation
      if (key.rightArrow || key.downArrow) {
        const currentIndex = allPanes.findIndex(p => p.id === focusedId);
        const nextIndex = (currentIndex + 1) % allPanes.length;
        const nextPane = allPanes[nextIndex];
        if (nextPane) setFocusedId(nextPane.id);
        return;
      }

      if (key.leftArrow || key.upArrow) {
        const currentIndex = allPanes.findIndex(p => p.id === focusedId);
        const prevIndex = (currentIndex - 1 + allPanes.length) % allPanes.length;
        const prevPane = allPanes[prevIndex];
        if (prevPane) setFocusedId(prevPane.id);
        return;
      }

      return;
    }

    // Enter prefix mode with Ctrl+<prefixKey>
    if (key.ctrl && input === prefixKey) {
      setPrefixMode(true);
      return;
    }

    // Exit multiplexer on Ctrl+Q (quick exit without prefix)
    if (key.ctrl && input === 'q') {
      exit();
      return;
    }

    // All other keys are passed through to the focused terminal
  }, { isActive: process.stdin.isTTY });

  // Handle pane exit
  const handlePaneExit = (paneId: string, _code: number) => {
    setExitedPanes(prev => new Set(prev).add(paneId));

    // If all panes have exited, exit the multiplexer
    if (exitedPanes.size + 1 >= allPanes.length) {
      exit();
    }
  };

  // Recursively render layout
  const renderLayout = (node: Layout, availableWidth: number, availableHeight: number, depth: number = 0): React.ReactNode => {
    if (node.type === 'pane') {
      const pane = node as Pane;
      const isFocused = pane.id === focusedId;
      const hasExited = exitedPanes.has(pane.id);

      // Calculate terminal dimensions
      // If borders are shown: account for border (2 chars) and optional title (1 row)
      // If no borders: use full available space
      const borderPadding = showBorders ? 2 : 0;
      const titlePadding = showBorders && pane.title ? 1 : 0;
      const terminalCols = Math.max(10, availableWidth - borderPadding);
      const terminalRows = Math.max(3, availableHeight - titlePadding - (showBorders ? 1 : 0));

      const boxProps: any = {
        width: typeof pane.size === 'number' ? parseFlexSize(pane.size, availableWidth) : undefined,
        flexGrow: typeof pane.size === 'string' || pane.size === undefined ? 1 : 0,
        flexShrink: 0,
        flexDirection: 'column',
      };

      // Only add border if showBorders is true
      if (showBorders) {
        boxProps.borderStyle = 'single';
        boxProps.borderColor = isFocused ? 'cyan' : hasExited ? 'gray' : 'white';
      }

      return (
        <Box key={pane.id} {...boxProps}>
          {/* Title bar (only show if borders are enabled) */}
          {showBorders && pane.title && (
            <Box>
              <Text
                bold={isFocused}
                color={isFocused ? 'cyan' : 'white'}
              >
                {pane.title}
              </Text>
            </Box>
          )}

          {/* Terminal */}
          <Terminal
            command={pane.command}
            args={pane.args}
            cwd={pane.cwd}
            env={pane.env}
            cols={terminalCols}
            rows={terminalRows}
            interactive={pane.interactive ?? true}  // Default to interactive for tmux panes
            focused={isFocused}  // Pass focus state to terminal
            onExit={(code) => {
              if (process.env.DEBUG_MUX) {
                console.error(`[MUX] Pane ${pane.id} exited with code ${code}`);
              }
              handlePaneExit(pane.id, code);
            }}
            onData={(output) => {
              if (process.env.DEBUG_MUX) {
                console.error(`[MUX] Pane ${pane.id} got ${output.length} lines`);
                const firstLine = output[0];
                const firstToken = firstLine?.[0];
                if (output.length > 0 && firstToken) {
                  console.error(`[MUX] First token: "${firstToken.text.substring(0, 50)}"`);
                }
              }
            }}
          />
        </Box>
      );
    } else {
      const split = node as Split;

      // Calculate dimensions for child nodes
      const childCount = split.children.length || 1;
      const childWidth = split.direction === 'horizontal'
        ? Math.floor(availableWidth / childCount)
        : availableWidth;
      const childHeight = split.direction === 'vertical'
        ? Math.floor(availableHeight / childCount)
        : availableHeight;

      return (
        <Box
          key={`split-${split.id}`}
          flexDirection={split.direction === 'horizontal' ? 'row' : 'column'}
          width={typeof split.size === 'number' ? parseFlexSize(split.size, availableWidth) : undefined}
          height={typeof split.size === 'number' ? parseFlexSize(split.size, availableHeight) : undefined}
          flexGrow={typeof split.size === 'string' || split.size === undefined ? 1 : 0}
          flexShrink={0}
        >
          {split.children.map(child => renderLayout(child, childWidth, childHeight, depth + 1))}
        </Box>
      );
    }
  };

  const prefixKeyDisplay = `Ctrl+${prefixKey.toUpperCase()}`;

  // Calculate content height accounting for help text and indicators
  let contentHeight = height;

  // In full screen mode, be more conservative with height
  if (enterFullScreen) {
    contentHeight = height - 1; // Always leave 1 line for safety
  } else if (showHelp) {
    contentHeight -= 2; // Space for help text at bottom
  }

  const helpModalWidth = Math.min(70, width - 4);

  return (
    <Box flexDirection="column">
      {/* Main content area - always render terminals */}
      <Box width={width} height={contentHeight}>
        {renderLayout(layout, width, contentHeight)}
      </Box>

      {/* Help Modal Overlay - rendered on top using negative margin */}
      {showHelpModal && (
        <Box
          marginTop={-contentHeight + Math.floor((contentHeight - 18) / 2)}
          width="100%"
          justifyContent="center"
        >
          <Box
            width={helpModalWidth}
            borderStyle="double"
            borderColor="cyan"
            flexDirection="column"
            paddingX={2}
            paddingY={1}
            backgroundColor="black"
          >
            <Box marginBottom={1}>
              <Text bold color="cyan">
                Key Bindings
              </Text>
            </Box>

            <Box flexDirection="column">
              <Text bold color="yellow">
                Prefix Key: {prefixKeyDisplay}
              </Text>
              <Text dimColor>Press {prefixKeyDisplay} before any command below</Text>
              <Text> </Text>

              <Text>
                <Text color="green">?</Text> - Show this help
              </Text>
              <Text>
                <Text color="green">n, o</Text> - Next pane
              </Text>
              <Text>
                <Text color="green">p</Text> - Previous pane
              </Text>
              <Text>
                <Text color="green">→, ↓</Text> - Next pane (arrow keys)
              </Text>
              <Text>
                <Text color="green">←, ↑</Text> - Previous pane (arrow keys)
              </Text>
              <Text>
                <Text color="green">d, x</Text> - Exit multiplexer
              </Text>
              <Text> </Text>
              <Text>
                <Text color="green">Ctrl+C (twice)</Text> - Exit (safety)
              </Text>
              <Text> </Text>

              <Text dimColor>
                Press any key to close this help
              </Text>
            </Box>
          </Box>
        </Box>
      )}

      {/* Status indicators at bottom - only show when not in full screen or overlay */}
      {!enterFullScreen && !showHelpModal && (
        <>
          {/* Prefix Mode Indicator */}
          {prefixMode && (
            <Box
              width="100%"
              justifyContent="flex-end"
            >
              <Box
                paddingX={1}
                borderStyle="round"
                borderColor="yellow"
              >
                <Text bold color="yellow">
                  PREFIX ({prefixKeyDisplay})
                </Text>
              </Box>
            </Box>
          )}

          {/* Ctrl+C indicator */}
          {ctrlCPressed && (
            <Box
              width="100%"
              justifyContent="center"
            >
              <Box
                paddingX={1}
                borderStyle="round"
                borderColor="red"
              >
                <Text bold color="red">
                  Press Ctrl+C again to exit
                </Text>
              </Box>
            </Box>
          )}
        </>
      )}

      {/* Help text - only in non-fullscreen or at bottom */}
      {showHelp && !enterFullScreen && (
        <Box>
          <Text dimColor>
            {prefixKeyDisplay} ?: Help | {prefixKeyDisplay} n/p: Switch | Ctrl+C (x2): Exit
          </Text>
        </Box>
      )}
    </Box>
  );
};
