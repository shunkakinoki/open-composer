/**
 * Terminal utilities tests
 */

import { describe, expect, test } from "bun:test";
import {
  applyStyle,
  getNtscGrayscale,
  padText,
  truncateText,
  wrapText,
} from "../../../src/components/Terminal/utils.js";

describe("Terminal utilities", () => {
  describe("applyStyle", () => {
    test("applies foreground color", () => {
      const result = applyStyle({ fg: "#FF0000" });
      expect(result).toContain("38;2");
    });

    test("applies background color", () => {
      const result = applyStyle({ bg: "#00FF00" });
      expect(result).toContain("48;2");
    });

    test("applies bold", () => {
      const result = applyStyle({ bold: true });
      expect(result).toBe("\x1b[1m");
    });

    test("applies italic", () => {
      const result = applyStyle({ italic: true });
      expect(result).toBe("\x1b[3m");
    });

    test("applies underline", () => {
      const result = applyStyle({ underline: true });
      expect(result).toBe("\x1b[4m");
    });

    test("applies multiple styles", () => {
      const result = applyStyle({ bold: true, italic: true, underline: true });
      expect(result).toContain("\x1b[1m");
      expect(result).toContain("\x1b[3m");
      expect(result).toContain("\x1b[4m");
    });

    test("returns empty string for no styles", () => {
      const result = applyStyle({});
      expect(result).toBe("");
    });
  });

  describe("wrapText", () => {
    test("wraps text at specified width", () => {
      const text = "This is a long line that should wrap";
      const result = wrapText(text, 15);
      expect(result.length).toBeGreaterThan(1);
      expect(result[0].length).toBeLessThanOrEqual(15);
    });

    test("handles text shorter than width", () => {
      const text = "Short";
      const result = wrapText(text, 20);
      expect(result).toEqual(["Short"]);
    });

    test("handles single long word", () => {
      const text = "Verylongwordthatcantwrap";
      const result = wrapText(text, 10);
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    test("handles empty text", () => {
      const result = wrapText("", 10);
      expect(result).toEqual([]);
    });

    test("preserves multiple words on same line when possible", () => {
      const text = "one two three";
      const result = wrapText(text, 20);
      expect(result).toEqual(["one two three"]);
    });
  });

  describe("truncateText", () => {
    test("truncates long text", () => {
      const text = "This is a very long text";
      const result = truncateText(text, 10);
      expect(result).toBe("This is...");
      expect(result.length).toBe(10);
    });

    test("does not truncate short text", () => {
      const text = "Short";
      const result = truncateText(text, 10);
      expect(result).toBe("Short");
    });

    test("handles exact length", () => {
      const text = "Exactly10c";
      const result = truncateText(text, 10);
      expect(result).toBe("Exactly10c");
    });

    test("handles empty text", () => {
      const result = truncateText("", 10);
      expect(result).toBe("");
    });
  });

  describe("padText", () => {
    test("pads text on right (left align)", () => {
      const result = padText("Test", 10, "left");
      expect(result).toBe("Test      ");
      expect(result.length).toBe(10);
    });

    test("pads text on left (right align)", () => {
      const result = padText("Test", 10, "right");
      expect(result).toBe("      Test");
      expect(result.length).toBe(10);
    });

    test("pads text on both sides (center align)", () => {
      const result = padText("Test", 10, "center");
      expect(result).toBe("   Test   ");
      expect(result.length).toBe(10);
    });

    test("handles odd padding for center align", () => {
      const result = padText("Test", 9, "center");
      expect(result.length).toBe(9);
      expect(result).toContain("Test");
    });

    test("truncates if text is longer than width", () => {
      const result = padText("Verylongtext", 5);
      expect(result).toBe("Veryl");
      expect(result.length).toBe(5);
    });

    test("defaults to left align", () => {
      const result = padText("Test", 10);
      expect(result).toBe("Test      ");
    });

    test("handles exact width", () => {
      const result = padText("Test", 4);
      expect(result).toBe("Test");
    });
  });

  describe("getNtscGrayscale", () => {
    test("calculates grayscale for white", () => {
      const result = getNtscGrayscale(255, 255, 255);
      expect(result).toBeCloseTo(255, 0);
    });

    test("calculates grayscale for black", () => {
      const result = getNtscGrayscale(0, 0, 0);
      expect(result).toBe(0);
    });

    test("calculates grayscale for pure red", () => {
      const result = getNtscGrayscale(255, 0, 0);
      expect(result).toBeCloseTo(76.245, 2);
    });

    test("calculates grayscale for pure green", () => {
      const result = getNtscGrayscale(0, 255, 0);
      expect(result).toBeCloseTo(149.685, 2);
    });

    test("calculates grayscale for pure blue", () => {
      const result = getNtscGrayscale(0, 0, 255);
      expect(result).toBeCloseTo(29.07, 2);
    });

    test("uses correct NTSC weights", () => {
      // NTSC formula: 0.299*R + 0.587*G + 0.114*B
      const result = getNtscGrayscale(100, 150, 200);
      const expected = 100 * 0.299 + 150 * 0.587 + 200 * 0.114;
      expect(result).toBeCloseTo(expected, 2);
    });
  });
});
