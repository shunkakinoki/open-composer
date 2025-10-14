/**
 * ANSI escape code utilities
 * Inspired by termact: https://github.com/MasterGordon/termact/blob/main/src/my-ansi.ts
 */

export const CSI = "\x1b[";
export const REGEX_ESCAPED_CSI = "\x1b\\[";

export const buttonsMask = {
  wheelUp: 64,
  wheelDown: 65,
  rightMb: 2,
  middleMb: 1,
  leftMb: 0,
} as const;

export const modifiersMask = {
  shift: 4,
  meta: 8,
  ctrl: 16,
} as const;

export const ansiCodes = {
  enableMouseTracking: `${CSI}?1000;1006;1003h`,
  disableMouseTracking: `${CSI}?1000;1006;1003l`,
  enableAlternateBuffer: `${CSI}?1049h`,
  disableAlternateBuffer: `${CSI}?1049l`,
  hideCursor: `${CSI}?25l`,
  showCursor: `${CSI}?25h`,
  eraseInDisplay: `${CSI}2J`,
  reset: "\x1b[0m",
} as const;

export type CursorStyle =
  | "blinkingBlock"
  | "block"
  | "blinkingUnderline"
  | "underline"
  | "blinkingBar"
  | "bar";

export const setCursorStyle = (style: CursorStyle): string =>
  `${CSI}${style} q`;

export const moveCursor = (x: number, y: number): string => `${CSI}${y};${x}H`;

export const hexToRgb = (hex: string): readonly [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return [
    Number.parseInt(result[1], 16),
    Number.parseInt(result[2], 16),
    Number.parseInt(result[3], 16),
  ] as const;
};

export const color = (
  r: number,
  g: number,
  b: number,
  bg?: boolean,
): string => `\x1b[${bg ? "48" : "38"};2;${r};${g};${b}m`;

export const fg = (args: [number, number, number] | string): string => {
  if (typeof args === "string") {
    return color(...hexToRgb(args));
  }
  const [r, g, b] = args;
  return color(r, g, b);
};

export const bg = (args: [number, number, number] | string): string => {
  if (typeof args === "string") {
    return color(...hexToRgb(args), true);
  }
  return color(...args, true);
};

export const bold = (): string => "\x1b[1m";
export const dim = (): string => "\x1b[2m";
export const italic = (): string => "\x1b[3m";
export const underline = (): string => "\x1b[4m";
export const blink = (): string => "\x1b[5m";
export const inverse = (): string => "\x1b[7m";
export const hidden = (): string => "\x1b[8m";
export const strikethrough = (): string => "\x1b[9m";
export const doubleUnderline = (): string => "\x1b[21m";

export const cleanse = (text: string): string =>
  text.replace(/\u001b\[.+?m/g, "");

export const splitCharacters = (text: string): string[] => {
  const result: string[] = [];
  let current = "";
  let escape = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === "\x1b") {
      escape = true;
      current += char;
    } else if (escape) {
      current += char;
      if (char === "m") {
        escape = false;
      }
    } else {
      current += char;
      result.push(current);
      current = "";
    }
  }

  return result;
};

export const isCtrlInput = (code: number): boolean => code < 32;

export const decodeCtrlInput = (code: number): string => {
  if (code === 0) return "@";
  if (code === 27) return "[";
  if (code === 28) return "\\";
  if (code === 29) return "]";
  if (code === 30) return "^";
  if (code === 31) return "_";
  return String.fromCharCode(code + 64).toLowerCase();
};
