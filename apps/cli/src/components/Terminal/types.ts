/**
 * Terminal component types
 * Inspired by termact architecture: https://github.com/MasterGordon/termact
 */

export interface Modifier {
  shift: boolean;
  meta: boolean;
  ctrl: boolean;
}

export type Button = "leftMb" | "middleMb" | "rightMb" | "wheelUp" | "wheelDown";
export type EventKind = "down" | "up";

export interface MouseEvent {
  x: number;
  y: number;
  button: Button;
  kind: EventKind;
  modifier: Modifier;
}

export interface TerminalStyle {
  fg?: string;
  bg?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  blink?: boolean;
  reverse?: boolean;
  hidden?: boolean;
  strikethrough?: boolean;
  doubleUnderline?: boolean;
}

export interface TerminalOptions {
  width?: number;
  height?: number;
  alternateBuffer?: boolean;
  mouseTracking?: boolean;
  cursorHidden?: boolean;
}

export interface TerminalSize {
  width: number;
  height: number;
}
