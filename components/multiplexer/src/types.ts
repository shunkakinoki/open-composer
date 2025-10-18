/**
 * Terminal Multiplexer Types
 * Based on stmux design
 */

/**
 * A pane represents a single terminal instance
 */
export interface Pane {
  type: 'pane';
  id: string;
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  /** Size specification: number (absolute), "50%" (percentage), "1/2" (fraction), or undefined (auto) */
  size?: string | number;
  /** Whether this pane should be initially focused */
  focus?: boolean;
  /** Pane title */
  title?: string;
  /** Enable interactive mode (defaults to true for multiplexer panes) */
  interactive?: boolean;
}

/**
 * A split container holds multiple panes or nested splits
 */
export interface Split {
  type: 'split';
  id: string;
  /** Split direction */
  direction: 'horizontal' | 'vertical';
  /** Child panes or splits */
  children: (Pane | Split)[];
  /** Size specification: number (absolute), "50%" (percentage), "1/2" (fraction), or undefined (auto) */
  size?: string | number;
}

/**
 * Root layout type
 */
export type Layout = Pane | Split;

/**
 * Calculated dimensions for rendering
 */
export interface Dimensions {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Pane with calculated dimensions
 */
export interface PositionedPane extends Pane, Dimensions {
  index: number; // Global pane index for navigation
}
