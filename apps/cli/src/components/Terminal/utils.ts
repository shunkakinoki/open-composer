/**
 * Terminal utility functions
 * Inspired by termact: https://github.com/MasterGordon/termact/blob/main/src/utils.ts
 */

import type { TerminalStyle } from "./types.js";
import {
  bg,
  blink,
  bold,
  doubleUnderline,
  fg,
  hidden,
  inverse,
  italic,
  strikethrough,
  underline,
} from "./ansi.js";

export const applyStyle = (style: TerminalStyle): string => {
  let result = "";
  if (style.fg) result += fg(style.fg);
  if (style.bg) result += bg(style.bg);
  if (style.bold) result += bold();
  if (style.italic) result += italic();
  if (style.underline) result += underline();
  if (style.blink) result += blink();
  if (style.reverse) result += inverse();
  if (style.hidden) result += hidden();
  if (style.strikethrough) result += strikethrough();
  if (style.doubleUnderline) result += doubleUnderline();
  return result;
};

export const wrapText = (text: string, width: number): string[] => {
  const lines: string[] = [];
  const words = text.split(" ");
  let currentLine = "";

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= width) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + "...";
};

export const padText = (
  text: string,
  width: number,
  align: "left" | "center" | "right" = "left",
): string => {
  if (text.length >= width) {
    return text.slice(0, width);
  }

  const padding = width - text.length;

  switch (align) {
    case "center": {
      const leftPad = Math.floor(padding / 2);
      const rightPad = padding - leftPad;
      return " ".repeat(leftPad) + text + " ".repeat(rightPad);
    }
    case "right":
      return " ".repeat(padding) + text;
    default:
      return text + " ".repeat(padding);
  }
};

export const getNtscGrayscale = (r: number, g: number, b: number): number => {
  return r * 0.299 + g * 0.587 + b * 0.114;
};
