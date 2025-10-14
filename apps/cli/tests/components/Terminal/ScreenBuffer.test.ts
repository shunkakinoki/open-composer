/**
 * ScreenBuffer tests
 */

import { describe, expect, test } from "bun:test";
import { ScreenBuffer } from "../../../src/components/Terminal/ScreenBuffer.js";

describe("ScreenBuffer", () => {
  test("creates buffer with correct dimensions", () => {
    const buffer = new ScreenBuffer(10, 5);
    expect(buffer.getWidth()).toBe(10);
    expect(buffer.getHeight()).toBe(5);
  });

  test("initializes with empty spaces", () => {
    const buffer = new ScreenBuffer(3, 2);
    expect(buffer.get(0, 0)).toBe(" ");
    expect(buffer.get(2, 1)).toBe(" ");
  });

  test("sets and gets values correctly", () => {
    const buffer = new ScreenBuffer(5, 5);
    buffer.set(2, 3, "X");
    expect(buffer.get(2, 3)).toBe("X");
  });

  test("handles out-of-bounds get gracefully", () => {
    const buffer = new ScreenBuffer(5, 5);
    expect(buffer.get(-1, 0)).toBe(" ");
    expect(buffer.get(0, -1)).toBe(" ");
    expect(buffer.get(10, 0)).toBe(" ");
    expect(buffer.get(0, 10)).toBe(" ");
  });

  test("handles out-of-bounds set gracefully", () => {
    const buffer = new ScreenBuffer(5, 5);
    buffer.set(-1, 0, "X");
    buffer.set(0, -1, "Y");
    buffer.set(10, 0, "Z");
    expect(buffer.get(0, 0)).toBe(" ");
  });

  test("clears buffer correctly", () => {
    const buffer = new ScreenBuffer(3, 3);
    buffer.set(0, 0, "A");
    buffer.set(1, 1, "B");
    buffer.set(2, 2, "C");

    buffer.clear();

    expect(buffer.get(0, 0)).toBe(" ");
    expect(buffer.get(1, 1)).toBe(" ");
    expect(buffer.get(2, 2)).toBe(" ");
  });

  test("converts to string correctly", () => {
    const buffer = new ScreenBuffer(3, 2);
    buffer.set(0, 0, "A");
    buffer.set(1, 0, "B");
    buffer.set(2, 0, "C");
    buffer.set(0, 1, "X");
    buffer.set(1, 1, "Y");
    buffer.set(2, 1, "Z");

    const result = buffer.toString();
    expect(result).toBe("ABC\nXYZ");
  });

  test("resizes buffer correctly (larger)", () => {
    const buffer = new ScreenBuffer(3, 2);
    buffer.set(0, 0, "A");
    buffer.set(1, 1, "B");

    buffer.resize(5, 4);

    expect(buffer.getWidth()).toBe(5);
    expect(buffer.getHeight()).toBe(4);
    expect(buffer.get(0, 0)).toBe("A");
    expect(buffer.get(1, 1)).toBe("B");
  });

  test("resizes buffer correctly (smaller)", () => {
    const buffer = new ScreenBuffer(5, 5);
    buffer.set(0, 0, "A");
    buffer.set(4, 4, "Z");

    buffer.resize(3, 3);

    expect(buffer.getWidth()).toBe(3);
    expect(buffer.getHeight()).toBe(3);
    expect(buffer.get(0, 0)).toBe("A");
  });

  test("resize with same dimensions does nothing", () => {
    const buffer = new ScreenBuffer(5, 5);
    buffer.set(2, 2, "X");

    buffer.resize(5, 5);

    expect(buffer.getWidth()).toBe(5);
    expect(buffer.getHeight()).toBe(5);
    expect(buffer.get(2, 2)).toBe("X");
  });

  test("gets line correctly", () => {
    const buffer = new ScreenBuffer(5, 3);
    buffer.setLine(1, "HELLO");

    const line = buffer.getLine(1);
    expect(line).toBe("HELLO");
  });

  test("sets line correctly", () => {
    const buffer = new ScreenBuffer(10, 5);
    buffer.setLine(2, "TEST");

    expect(buffer.get(0, 2)).toBe("T");
    expect(buffer.get(1, 2)).toBe("E");
    expect(buffer.get(2, 2)).toBe("S");
    expect(buffer.get(3, 2)).toBe("T");
  });

  test("setLine truncates long text", () => {
    const buffer = new ScreenBuffer(3, 2);
    buffer.setLine(0, "ABCDEFGH");

    expect(buffer.getLine(0)).toBe("ABC");
  });

  test("getLine returns empty for out-of-bounds", () => {
    const buffer = new ScreenBuffer(5, 5);
    expect(buffer.getLine(-1)).toBe("");
    expect(buffer.getLine(10)).toBe("");
  });

  test("setLine ignores out-of-bounds", () => {
    const buffer = new ScreenBuffer(5, 5);
    buffer.setLine(-1, "INVALID");
    buffer.setLine(10, "INVALID");

    expect(buffer.toString()).toContain("     ");
  });
});
