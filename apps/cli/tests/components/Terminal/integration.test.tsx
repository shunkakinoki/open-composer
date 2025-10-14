/**
 * Terminal integration tests with actual commands
 */

import { describe, expect, test } from "bun:test";
import { ScreenBuffer } from "../../../src/components/Terminal/ScreenBuffer.js";
import { CommandTerminal } from "../../../src/components/Terminal/CommandTerminal.js";
import {
  applyStyle,
  padText,
  truncateText,
  wrapText,
} from "../../../src/components/Terminal/utils.js";
import {
  bold,
  cleanse,
  fg,
  moveCursor,
} from "../../../src/components/Terminal/ansi.js";
import { render } from "../../utils.js";

describe("Terminal Integration", () => {
  describe("ScreenBuffer with actual content", () => {
    test("renders multi-line text correctly", () => {
      const buffer = new ScreenBuffer(40, 10);

      const lines = ["Line 1", "Line 2", "Line 3"];
      lines.forEach((line, index) => {
        buffer.setLine(index, line);
      });

      const output = buffer.toString();
      expect(output).toContain("Line 1");
      expect(output).toContain("Line 2");
      expect(output).toContain("Line 3");
    });

    test("renders a simple box with border", () => {
      const buffer = new ScreenBuffer(20, 5);

      // Top border
      buffer.setLine(0, "┌" + "─".repeat(18) + "┐");
      // Content
      buffer.setLine(1, "│ Hello Terminal  │");
      buffer.setLine(2, "│ Test Content    │");
      buffer.setLine(3, "│                 │");
      // Bottom border
      buffer.setLine(4, "└" + "─".repeat(18) + "┘");

      const output = buffer.toString();
      expect(output).toContain("┌");
      expect(output).toContain("Hello Terminal");
      expect(output).toContain("└");
    });

    test("handles cursor positioning", () => {
      const buffer = new ScreenBuffer(10, 10);

      // Draw at specific positions
      buffer.set(5, 5, "X");
      buffer.set(0, 0, "A");
      buffer.set(9, 9, "Z");

      expect(buffer.get(5, 5)).toBe("X");
      expect(buffer.get(0, 0)).toBe("A");
      expect(buffer.get(9, 9)).toBe("Z");
    });

    test("draws a horizontal line", () => {
      const buffer = new ScreenBuffer(30, 5);
      const line = "─".repeat(30);
      buffer.setLine(2, line);

      const output = buffer.getLine(2);
      expect(output).toBe(line);
    });

    test("draws a vertical line", () => {
      const buffer = new ScreenBuffer(10, 10);

      for (let y = 0; y < 10; y++) {
        buffer.set(5, y, "│");
      }

      for (let y = 0; y < 10; y++) {
        expect(buffer.get(5, y)).toBe("│");
      }
    });
  });

  describe("Text utilities in real scenarios", () => {
    test("wraps long text for terminal display", () => {
      const longText =
        "This is a very long line of text that needs to be wrapped to fit within the terminal width";
      const wrapped = wrapText(longText, 30);

      expect(wrapped.length).toBeGreaterThan(1);
      wrapped.forEach((line) => {
        expect(line.length).toBeLessThanOrEqual(30);
      });
    });

    test("truncates text with ellipsis", () => {
      const text = "This is a long text that should be truncated";
      const truncated = truncateText(text, 20);

      expect(truncated.length).toBeLessThanOrEqual(23); // 20 + "..."
      expect(truncated).toContain("...");
    });

    test("pads text to specified width", () => {
      const text = "Hello";
      const padded = padText(text, 10);

      expect(padded.length).toBe(10);
      expect(padded).toContain("Hello");
    });

    test("applies ANSI styles to text", () => {
      const styled = applyStyle({ bold: true, fg: "#ff0000" });

      expect(styled).toBeTruthy();
      expect(styled.length).toBeGreaterThan(0);
      expect(styled).toContain("\x1b[");
    });
  });

  describe("ANSI Code Processing", () => {
    test("generates bold text ANSI code", () => {
      const result = bold();

      expect(result).toBeTruthy();
      expect(result).toContain("\x1b["); // ANSI escape sequence
      expect(result).toBe("\x1b[1m");
    });

    test("generates colored text ANSI code", () => {
      const result = fg("#ff0000");

      expect(result).toBeTruthy();
      expect(result).toContain("\x1b["); // ANSI escape sequence
    });

    test("cleanses ANSI codes from text", () => {
      const styledText = `\x1b[1mBold\x1b[0m \x1b[31mRed\x1b[0m`;
      const clean = cleanse(styledText);

      expect(clean).toBe("Bold Red");
      expect(clean).not.toContain("\x1b[");
    });

    test("generates cursor movement codes", () => {
      const moveCode = moveCursor(5, 10);

      expect(moveCode).toContain("\x1b[");
      expect(typeof moveCode).toBe("string");
    });
  });

  describe("Real Command Workflows", () => {
    test("runs actual terminal commands with live output using CommandTerminal", async () => {
      const commands = [
        { command: "echo", args: ["Hello World"], expectedOutput: "Hello World" },
        { command: "pwd", args: [], expectedOutput: process.cwd() },
        { command: "node", args: ["--version"], expectedOutput: "v" },
      ];

      for (const { command, args, expectedOutput } of commands) {
        let completed = false;
        let capturedExitCode: number | null = null;

        const { lastFrame, unmount } = render(
          <CommandTerminal
            command={command}
            args={args}
            onComplete={(code) => {
              capturedExitCode = code;
              completed = true;
            }}
          />,
        );

        // Wait for command to complete
        await new Promise<void>((resolve) => {
          const checkInterval = setInterval(() => {
            if (completed) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 50);

          // Timeout after 5 seconds
          setTimeout(() => {
            clearInterval(checkInterval);
            resolve();
          }, 5000);
        });

        const frame = lastFrame();

        expect(frame).toContain(`$ ${command}`);
        expect(frame).toContain(expectedOutput);
        expect(capturedExitCode).not.toBeNull();
        expect(capturedExitCode === 0).toBe(true);

        unmount();
      }
    });

    test("runs complex shell commands with piping and output", async () => {
      let completed = false;
      let capturedExitCode: number | null = null;

      const { lastFrame, unmount } = render(
        <CommandTerminal
          command="sh"
          args={["-c", "echo 'Line 1' && echo 'Line 2' && echo 'Line 3'"]}
          onComplete={(code) => {
            capturedExitCode = code;
            completed = true;
          }}
        />,
      );

      // Wait for command to complete
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (completed) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 50);

        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 5000);
      });

      const frame = lastFrame();

      expect(frame).toContain("Line 1");
      expect(frame).toContain("Line 2");
      expect(frame).toContain("Line 3");
      expect(capturedExitCode).not.toBeNull();
      expect(capturedExitCode === 0).toBe(true);

      unmount();
    });

    test("displays environment variables from command", async () => {
      let completed = false;

      const { lastFrame, unmount } = render(
        <CommandTerminal
          command="sh"
          args={["-c", "echo $PATH | head -c 50"]}
          onComplete={() => {
            completed = true;
          }}
        />,
      );

      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (completed) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 50);

        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 5000);
      });

      const frame = lastFrame();

      expect(frame).toBeDefined();
      expect(frame).toContain("$ sh");
      if (frame) {
        expect(frame.length).toBeGreaterThan(0);
      }

      unmount();
    });

    test("runs command that lists files in current directory", async () => {
      let completed = false;

      const { lastFrame, unmount } = render(
        <CommandTerminal
          command="sh"
          args={["-c", "ls -la | head -5"]}
          onComplete={() => {
            completed = true;
          }}
        />,
      );

      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (completed) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 50);

        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 5000);
      });

      const frame = lastFrame();

      expect(frame).toBeDefined();
      expect(frame).toContain("$ sh");
      if (frame) {
        expect(frame.length).toBeGreaterThan(0);
      }

      unmount();
    });

    test("handles command with non-zero exit code", async () => {
      let completed = false;
      let capturedExitCode: number | null = null;

      const { lastFrame, unmount } = render(
        <CommandTerminal
          command="false"
          args={[]}
          onComplete={(code) => {
            capturedExitCode = code;
            completed = true;
          }}
        />,
      );

      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (completed) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 50);

        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 5000);
      });

      const frame = lastFrame();

      expect(frame).toContain("$ false");
      expect(capturedExitCode).not.toBeNull();
      expect(capturedExitCode !== 0).toBe(true);

      unmount();
    });

    test("captures stderr output", async () => {
      let completed = false;

      const { lastFrame, unmount } = render(
        <CommandTerminal
          command="sh"
          args={["-c", "echo 'Error message' >&2"]}
          onComplete={() => {
            completed = true;
          }}
        />,
      );

      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (completed) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 50);

        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 5000);
      });

      const frame = lastFrame();

      expect(frame).toContain("Error message");

      unmount();
    });
  });
});
