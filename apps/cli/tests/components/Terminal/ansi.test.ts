/**
 * ANSI utilities tests
 */

import { describe, expect, test } from "bun:test";
import {
  bg,
  blink,
  bold,
  cleanse,
  decodeCtrlInput,
  dim,
  doubleUnderline,
  fg,
  hexToRgb,
  hidden,
  inverse,
  isCtrlInput,
  italic,
  moveCursor,
  setCursorStyle,
  splitCharacters,
  strikethrough,
  underline,
} from "../../../src/components/Terminal/ansi.js";

describe("ANSI utilities", () => {
  describe("color utilities", () => {
    test("hexToRgb converts hex to RGB", () => {
      expect(hexToRgb("#FF0000")).toEqual([255, 0, 0]);
      expect(hexToRgb("#00FF00")).toEqual([0, 255, 0]);
      expect(hexToRgb("#0000FF")).toEqual([0, 0, 255]);
      expect(hexToRgb("FFFFFF")).toEqual([255, 255, 255]);
    });

    test("hexToRgb throws on invalid hex", () => {
      expect(() => hexToRgb("invalid")).toThrow("Invalid hex color");
      expect(() => hexToRgb("#GG0000")).toThrow("Invalid hex color");
    });

    test("fg creates foreground color code", () => {
      const result = fg("#FF0000");
      expect(result).toContain("38;2");
      expect(result).toContain("255");
    });

    test("fg works with RGB array", () => {
      const result = fg([255, 0, 0]);
      expect(result).toContain("38;2");
      expect(result).toContain("255");
    });

    test("bg creates background color code", () => {
      const result = bg("#00FF00");
      expect(result).toContain("48;2");
      expect(result).toContain("255");
    });

    test("bg works with RGB array", () => {
      const result = bg([0, 255, 0]);
      expect(result).toContain("48;2");
      expect(result).toContain("255");
    });
  });

  describe("text styling", () => {
    test("bold creates bold code", () => {
      expect(bold()).toBe("\x1b[1m");
    });

    test("dim creates dim code", () => {
      expect(dim()).toBe("\x1b[2m");
    });

    test("italic creates italic code", () => {
      expect(italic()).toBe("\x1b[3m");
    });

    test("underline creates underline code", () => {
      expect(underline()).toBe("\x1b[4m");
    });

    test("blink creates blink code", () => {
      expect(blink()).toBe("\x1b[5m");
    });

    test("inverse creates inverse code", () => {
      expect(inverse()).toBe("\x1b[7m");
    });

    test("hidden creates hidden code", () => {
      expect(hidden()).toBe("\x1b[8m");
    });

    test("strikethrough creates strikethrough code", () => {
      expect(strikethrough()).toBe("\x1b[9m");
    });

    test("doubleUnderline creates double underline code", () => {
      expect(doubleUnderline()).toBe("\x1b[21m");
    });
  });

  describe("cursor utilities", () => {
    test("moveCursor creates correct escape sequence", () => {
      expect(moveCursor(10, 5)).toBe("\x1b[5;10H");
      expect(moveCursor(1, 1)).toBe("\x1b[1;1H");
    });

    test("setCursorStyle creates correct style code", () => {
      expect(setCursorStyle("block")).toContain("block q");
      expect(setCursorStyle("underline")).toContain("underline q");
      expect(setCursorStyle("bar")).toContain("bar q");
    });
  });

  describe("text processing", () => {
    test("cleanse removes ANSI codes", () => {
      const text = "\x1b[31mRed\x1b[0m Normal";
      const result = cleanse(text);
      expect(result).toBe("Red Normal");
    });

    test("cleanse handles text without ANSI codes", () => {
      const text = "Plain text";
      expect(cleanse(text)).toBe("Plain text");
    });

    test("splitCharacters splits text with escape codes", () => {
      const text = "\x1b[31mHello";
      const result = splitCharacters(text);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toContain("\x1b[31m");
    });

    test("splitCharacters handles plain text", () => {
      const text = "ABC";
      const result = splitCharacters(text);
      expect(result).toEqual(["A", "B", "C"]);
    });
  });

  describe("control input utilities", () => {
    test("isCtrlInput identifies control codes", () => {
      expect(isCtrlInput(0)).toBe(true);
      expect(isCtrlInput(31)).toBe(true);
      expect(isCtrlInput(32)).toBe(false);
      expect(isCtrlInput(65)).toBe(false);
    });

    test("decodeCtrlInput decodes control codes correctly", () => {
      expect(decodeCtrlInput(0)).toBe("@");
      expect(decodeCtrlInput(27)).toBe("[");
      expect(decodeCtrlInput(28)).toBe("\\");
      expect(decodeCtrlInput(29)).toBe("]");
      expect(decodeCtrlInput(30)).toBe("^");
      expect(decodeCtrlInput(31)).toBe("_");
      expect(decodeCtrlInput(1)).toBe("a"); // Ctrl+A
      expect(decodeCtrlInput(3)).toBe("c"); // Ctrl+C
    });
  });
});
