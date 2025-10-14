/**
 * EventEmitter tests
 */

import { describe, expect, test } from "bun:test";
import { EventEmitter } from "../../../src/components/Terminal/EventEmitter.js";

type TestEvents = {
  message: [string];
  data: [number, string];
  empty: [];
};

describe("EventEmitter", () => {
  test("registers and emits event with single argument", () => {
    const emitter = new EventEmitter<TestEvents>();
    let received = "";

    emitter.on("message", (msg: string) => {
      received = msg;
    });

    emitter.emit("message", "hello");
    expect(received).toBe("hello");
  });

  test("registers and emits event with multiple arguments", () => {
    const emitter = new EventEmitter<TestEvents>();
    let receivedNum = 0;
    let receivedStr = "";

    emitter.on("data", (num: number, str: string) => {
      receivedNum = num;
      receivedStr = str;
    });

    emitter.emit("data", 42, "test");
    expect(receivedNum).toBe(42);
    expect(receivedStr).toBe("test");
  });

  test("registers and emits event with no arguments", () => {
    const emitter = new EventEmitter<TestEvents>();
    let called = false;

    emitter.on("empty", () => {
      called = true;
    });

    emitter.emit("empty");
    expect(called).toBe(true);
  });

  test("supports multiple listeners for same event", () => {
    const emitter = new EventEmitter<TestEvents>();
    const received: string[] = [];

    emitter.on("message", (msg: string) => {
      received.push(`first: ${msg}`);
    });

    emitter.on("message", (msg: string) => {
      received.push(`second: ${msg}`);
    });

    emitter.emit("message", "test");
    expect(received).toEqual(["first: test", "second: test"]);
  });

  test("removes listener correctly", () => {
    const emitter = new EventEmitter<TestEvents>();
    let count = 0;

    const listener = () => {
      count++;
    };

    emitter.on("empty", listener);
    emitter.emit("empty");
    expect(count).toBe(1);

    emitter.off("empty", listener);
    emitter.emit("empty");
    expect(count).toBe(1); // Should not increase
  });

  test("removes only specified listener", () => {
    const emitter = new EventEmitter<TestEvents>();
    let count1 = 0;
    let count2 = 0;

    const listener1 = () => {
      count1++;
    };
    const listener2 = () => {
      count2++;
    };

    emitter.on("empty", listener1);
    emitter.on("empty", listener2);

    emitter.off("empty", listener1);
    emitter.emit("empty");

    expect(count1).toBe(0);
    expect(count2).toBe(1);
  });

  test("removeAllListeners clears all events", () => {
    const emitter = new EventEmitter<TestEvents>();
    let count1 = 0;
    let count2 = 0;

    emitter.on("message", () => {
      count1++;
    });
    emitter.on("data", () => {
      count2++;
    });

    emitter.removeAllListeners();

    emitter.emit("message", "test");
    emitter.emit("data", 42, "test");

    expect(count1).toBe(0);
    expect(count2).toBe(0);
  });

  test("does not error when removing non-existent listener", () => {
    const emitter = new EventEmitter<TestEvents>();
    const listener = () => {};

    expect(() => {
      emitter.off("message", listener);
    }).not.toThrow();
  });

  test("does not error when emitting with no listeners", () => {
    const emitter = new EventEmitter<TestEvents>();

    expect(() => {
      emitter.emit("message", "test");
    }).not.toThrow();
  });
});
