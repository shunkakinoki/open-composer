/**
 * Terminal integration tests with actual commands
 */

import { Box, Text } from "ink";
import { describe, expect, test } from "bun:test";
import { ScreenBuffer } from "../../../src/components/Terminal/ScreenBuffer.js";
import { Terminal } from "../../../src/components/Terminal/index.js";
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

    test("truncates long filenames", () => {
      const filename =
        "/very/long/path/to/some/file/that/should/be/truncated.txt";
      const truncated = truncateText(filename, 30);

      expect(truncated.length).toBe(30);
      expect(truncated.endsWith("...")).toBe(true);
    });

    test("pads status bar items", () => {
      const leftItem = padText("Status:", 15, "left");
      const centerItem = padText("Active", 15, "center");
      const rightItem = padText("100%", 15, "right");

      expect(leftItem.length).toBe(15);
      expect(centerItem.length).toBe(15);
      expect(rightItem.length).toBe(15);

      expect(leftItem.startsWith("Status:")).toBe(true);
      expect(centerItem.includes("Active")).toBe(true);
      expect(rightItem.endsWith("100%")).toBe(true);
    });
  });

  describe("ANSI styling in real content", () => {
    test("creates colored text output", () => {
      const redText = `${fg("#FF0000")}Error${cleanse("")}`;
      expect(redText).toContain("Error");
      expect(redText).toContain("\x1b[38;2");
    });

    test("creates bold text output", () => {
      const boldText = `${bold()}Important${cleanse("")}`;
      expect(boldText).toContain("Important");
      expect(boldText).toContain("\x1b[1m");
    });

    test("creates styled status messages", () => {
      const successStyle = applyStyle({ fg: "#00FF00", bold: true });
      const errorStyle = applyStyle({ fg: "#FF0000", bold: true });
      const warningStyle = applyStyle({ fg: "#FFFF00" });

      expect(successStyle).toContain("\x1b[");
      expect(errorStyle).toContain("\x1b[");
      expect(warningStyle).toContain("\x1b[");
    });

    test("positions cursor for status updates", () => {
      const position1 = moveCursor(10, 5);
      const position2 = moveCursor(0, 0);

      expect(position1).toBe("\x1b[5;10H");
      expect(position2).toBe("\x1b[0;0H");
    });
  });

  describe("Terminal component with complex layouts", () => {
    test("renders terminal with status bar", () => {
      const StatusBarExample = () => (
        <Terminal>
          <Box flexDirection="column">
            <Box borderStyle="single" paddingX={1}>
              <Text color="green">Ready</Text>
              <Text color="gray"> | </Text>
              <Text color="yellow">main</Text>
            </Box>
            <Box padding={1}>
              <Text>Content area</Text>
            </Box>
          </Box>
        </Terminal>
      );

      const { lastFrame } = render(<StatusBarExample />);
      const frame = lastFrame();

      expect(frame).toBeDefined();
      expect(frame).toContain("Ready");
      expect(frame).toContain("main");
      expect(frame).toContain("Content area");
    });

    test("renders terminal with list items", () => {
      const items = ["Item 1", "Item 2", "Item 3"];

      const ListExample = () => (
        <Terminal>
          <Box flexDirection="column">
            {items.map((item, index) => (
              <Box key={index}>
                <Text color="cyan">{`${index + 1}. `}</Text>
                <Text>{item}</Text>
              </Box>
            ))}
          </Box>
        </Terminal>
      );

      const { lastFrame } = render(<ListExample />);
      const frame = lastFrame();

      expect(frame).toBeDefined();
      expect(frame).toContain("Item 1");
      expect(frame).toContain("Item 2");
      expect(frame).toContain("Item 3");
    });

    test("renders terminal with table-like layout", () => {
      const TableExample = () => (
        <Terminal>
          <Box flexDirection="column">
            <Box borderStyle="single">
              <Box width={20}>
                <Text bold>Name</Text>
              </Box>
              <Box width={20}>
                <Text bold>Status</Text>
              </Box>
            </Box>
            <Box>
              <Box width={20}>
                <Text>Task 1</Text>
              </Box>
              <Box width={20}>
                <Text color="green">Done</Text>
              </Box>
            </Box>
          </Box>
        </Terminal>
      );

      const { lastFrame } = render(<TableExample />);
      const frame = lastFrame();

      expect(frame).toBeDefined();
      expect(frame).toContain("Name");
      expect(frame).toContain("Status");
      expect(frame).toContain("Task 1");
      expect(frame).toContain("Done");
    });

    test("renders terminal with progress indicator", () => {
      const progress = 75;
      const barWidth = 20;
      const filled = Math.floor((progress / 100) * barWidth);
      const empty = barWidth - filled;

      const ProgressExample = () => (
        <Terminal>
          <Box flexDirection="column">
            <Text>
              Progress: [{"█".repeat(filled)}
              {"░".repeat(empty)}] {progress}%
            </Text>
          </Box>
        </Terminal>
      );

      const { lastFrame } = render(<ProgressExample />);
      const frame = lastFrame();

      expect(frame).toBeDefined();
      expect(frame).toContain("Progress:");
      expect(frame).toContain("75%");
    });

    test("renders terminal with code block", () => {
      const codeLines = [
        "function hello() {",
        '  console.log("Hello");',
        "}",
      ];

      const CodeExample = () => (
        <Terminal>
          <Box flexDirection="column" borderStyle="round" paddingX={1}>
            {codeLines.map((line, index) => (
              <Text key={index} color="cyan">
                {line}
              </Text>
            ))}
          </Box>
        </Terminal>
      );

      const { lastFrame } = render(<CodeExample />);
      const frame = lastFrame();

      expect(frame).toBeDefined();
      expect(frame).toContain("function hello()");
      expect(frame).toContain('console.log("Hello")');
    });
  });

  describe("Buffer operations simulation", () => {
    test("simulates scrolling buffer", () => {
      const buffer = new ScreenBuffer(40, 10);
      const lines = Array.from(
        { length: 20 },
        (_, i) => `Line ${i + 1}`.padEnd(40),
      );

      // Show first 10 lines (initial view)
      for (let i = 0; i < 10; i++) {
        buffer.setLine(i, lines[i]);
      }

      let output = buffer.toString();
      expect(output).toContain("Line 1");
      expect(output).toContain("Line 10");
      expect(output).not.toContain("Line 11");

      // Scroll down (show lines 5-14)
      buffer.clear();
      for (let i = 0; i < 10; i++) {
        buffer.setLine(i, lines[i + 5]);
      }

      output = buffer.toString();
      expect(output).toContain("Line 6");
      expect(output).toContain("Line 15");
      expect(output).not.toContain("Line 5");
    });

    test("simulates live log streaming", () => {
      const buffer = new ScreenBuffer(50, 5);
      const logs = [
        "[INFO] Application started",
        "[DEBUG] Loading configuration",
        "[INFO] Server listening on port 3000",
        "[WARN] High memory usage detected",
        "[ERROR] Connection failed",
      ];

      // Add logs one by one
      logs.forEach((log, index) => {
        if (index < 5) {
          buffer.setLine(index, log);
        }
      });

      const output = buffer.toString();
      expect(output).toContain("[INFO]");
      expect(output).toContain("[ERROR]");
      expect(output).toContain("Connection failed");
    });

    test("simulates cursor movement in editor", () => {
      const buffer = new ScreenBuffer(40, 10);
      buffer.setLine(0, "Hello World");

      let cursorX = 0;
      let cursorY = 0;

      // Simulate moving cursor right
      cursorX = 6;
      buffer.set(cursorX, cursorY, "▌"); // Cursor indicator

      expect(buffer.get(6, 0)).toBe("▌");

      // Move cursor down
      buffer.set(cursorX, cursorY, "W"); // Restore original character
      cursorY = 1;
      buffer.set(cursorX, cursorY, "▌");

      expect(buffer.get(6, 1)).toBe("▌");
    });
  });

  describe("Real-world UI patterns", () => {
    test("renders a menu with selections", () => {
      const menuItems = ["Start Server", "Stop Server", "View Logs", "Exit"];
      const selectedIndex = 1;

      const MenuExample = () => (
        <Terminal>
          <Box flexDirection="column">
            <Text bold>Main Menu</Text>
            <Text> </Text>
            {menuItems.map((item, index) => (
              <Box key={index}>
                <Text color={index === selectedIndex ? "cyan" : "white"}>
                  {index === selectedIndex ? "→ " : "  "}
                  {item}
                </Text>
              </Box>
            ))}
          </Box>
        </Terminal>
      );

      const { lastFrame } = render(<MenuExample />);
      const frame = lastFrame();

      expect(frame).toContain("Main Menu");
      expect(frame).toContain("Start Server");
      expect(frame).toContain("→ Stop Server"); // Selected item
    });

    test("renders a command prompt", () => {
      const CommandPromptExample = () => (
        <Terminal>
          <Box flexDirection="column">
            <Text color="green">user@host</Text>
            <Text color="blue">:</Text>
            <Text color="cyan">~/project</Text>
            <Text>$ _</Text>
          </Box>
        </Terminal>
      );

      const { lastFrame } = render(<CommandPromptExample />);
      const frame = lastFrame();

      expect(frame).toContain("user@host");
      expect(frame).toContain("~/project");
      expect(frame).toContain("$");
    });

    test("renders split pane layout", () => {
      const SplitPaneExample = () => (
        <Terminal>
          <Box flexDirection="row">
            <Box flexDirection="column" borderStyle="single" paddingX={1}>
              <Text bold>Left Pane</Text>
              <Text>Content 1</Text>
              <Text>Content 2</Text>
            </Box>
            <Box flexDirection="column" borderStyle="single" paddingX={1}>
              <Text bold>Right Pane</Text>
              <Text>Details here</Text>
            </Box>
          </Box>
        </Terminal>
      );

      const { lastFrame } = render(<SplitPaneExample />);
      const frame = lastFrame();

      expect(frame).toContain("Left Pane");
      expect(frame).toContain("Right Pane");
      expect(frame).toContain("Content 1");
      expect(frame).toContain("Details here");
    });
  });

  describe("Command Execution Integration", () => {
    test("executes echo command and displays output automatically", async () => {
      let completed = false;
      let capturedExitCode: number | null = null;

      const { lastFrame, unmount } = render(
        <CommandTerminal
          command="echo"
          args={['"Hello from Terminal"']}
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
      });

      const frame = lastFrame();

      expect(frame).toContain("Hello from Terminal");
      expect(frame).toContain("$ echo");
      expect(capturedExitCode).toBe(0);
      expect(frame).toContain("Process exited with code 0");

      unmount();
    });

    test("executes ls command and displays directory listing", async () => {
      const { execSync } = await import("node:child_process");

      const output = execSync("ls -la", { encoding: "utf8" });
      const lines = output.split("\n").slice(0, 10); // Take first 10 lines

      const DirectoryListing = () => (
        <Terminal>
          <Box flexDirection="column">
            <Text color="cyan" bold>
              Directory Listing:
            </Text>
            {lines.map((line, index) => (
              <Text key={index}>{line}</Text>
            ))}
          </Box>
        </Terminal>
      );

      const { lastFrame } = render(<DirectoryListing />);
      const frame = lastFrame();

      expect(frame).toContain("Directory Listing");
      expect(lines.length).toBeGreaterThan(0);
    });

    test("executes date command and displays timestamp", async () => {
      const { execSync } = await import("node:child_process");

      const timestamp = execSync("date", { encoding: "utf8" }).trim();

      const TimestampDisplay = () => (
        <Terminal>
          <Box flexDirection="column">
            <Text color="yellow">Current Time:</Text>
            <Text>{timestamp}</Text>
          </Box>
        </Terminal>
      );

      const { lastFrame } = render(<TimestampDisplay />);
      const frame = lastFrame();

      expect(frame).toContain("Current Time");
      expect(timestamp.length).toBeGreaterThan(0);
    });

    test("executes node version command", async () => {
      const { execSync } = await import("node:child_process");

      const version = execSync("node --version", { encoding: "utf8" }).trim();

      const VersionDisplay = () => (
        <Terminal>
          <Box flexDirection="column">
            <Text color="green" bold>
              Node.js Version:
            </Text>
            <Text>{version}</Text>
          </Box>
        </Terminal>
      );

      const { lastFrame } = render(<VersionDisplay />);
      const frame = lastFrame();

      expect(frame).toContain("Node.js Version");
      expect(version).toMatch(/v\d+\.\d+\.\d+/);
    });

    test("executes pwd command and displays working directory", async () => {
      const { execSync } = await import("node:child_process");

      const pwd = execSync("pwd", { encoding: "utf8" }).trim();

      const WorkingDirectory = () => (
        <Terminal>
          <Box flexDirection="column">
            <Text color="blue">Working Directory:</Text>
            <Text>{pwd}</Text>
          </Box>
        </Terminal>
      );

      const { lastFrame } = render(<WorkingDirectory />);
      const frame = lastFrame();

      expect(frame).toContain("Working Directory");
      expect(pwd.length).toBeGreaterThan(0);
      expect(pwd.startsWith("/")).toBe(true);
    });
  });

  describe("Streaming Command Output", () => {
    test("streams command output line by line", async () => {
      const { spawn } = await import("node:child_process");

      const lines: string[] = [];
      const child = spawn("sh", [
        "-c",
        'echo "Line 1"; echo "Line 2"; echo "Line 3"',
      ]);

      await new Promise<void>((resolve) => {
        child.stdout?.on("data", (data) => {
          lines.push(data.toString().trim());
        });

        child.on("close", () => {
          resolve();
        });
      });

      const StreamedOutput = () => (
        <Terminal>
          <Box flexDirection="column">
            {lines.map((line, index) => (
              <Text key={index}>{line}</Text>
            ))}
          </Box>
        </Terminal>
      );

      const { lastFrame } = render(<StreamedOutput />);
      const frame = lastFrame();

      expect(frame).toContain("Line 1");
      expect(frame).toContain("Line 2");
      expect(frame).toContain("Line 3");
    });

    test("handles long-running command with progress updates", async () => {
      const { spawn } = await import("node:child_process");

      const updates: string[] = [];
      const child = spawn("sh", [
        "-c",
        'for i in 1 2 3; do echo "Processing: $i"; sleep 0.1; done',
      ]);

      await new Promise<void>((resolve) => {
        child.stdout?.on("data", (data) => {
          updates.push(data.toString().trim());
        });

        child.on("close", () => {
          resolve();
        });
      });

      const ProgressUpdates = () => (
        <Terminal>
          <Box flexDirection="column">
            <Text color="cyan" bold>
              Progress:
            </Text>
            {updates.map((update, index) => (
              <Text key={index} color="green">
                ✓ {update}
              </Text>
            ))}
          </Box>
        </Terminal>
      );

      const { lastFrame } = render(<ProgressUpdates />);
      const frame = lastFrame();

      expect(updates.length).toBe(3);
      expect(frame).toContain("Progress");
      expect(frame).toContain("Processing: 1");
      expect(frame).toContain("Processing: 3");
    });

    test("captures both stdout and stderr streams", async () => {
      const { spawn } = await import("node:child_process");

      const stdoutLines: string[] = [];
      const stderrLines: string[] = [];

      const child = spawn("sh", [
        "-c",
        'echo "Standard output"; echo "Error output" >&2',
      ]);

      await new Promise<void>((resolve) => {
        child.stdout?.on("data", (data) => {
          stdoutLines.push(data.toString().trim());
        });

        child.stderr?.on("data", (data) => {
          stderrLines.push(data.toString().trim());
        });

        child.on("close", () => {
          resolve();
        });
      });

      const OutputDisplay = () => (
        <Terminal>
          <Box flexDirection="column">
            <Text bold>Output:</Text>
            {stdoutLines.map((line, index) => (
              <Text key={`stdout-${index}`} color="white">
                {line}
              </Text>
            ))}
            {stderrLines.map((line, index) => (
              <Text key={`stderr-${index}`} color="red">
                Error: {line}
              </Text>
            ))}
          </Box>
        </Terminal>
      );

      const { lastFrame } = render(<OutputDisplay />);
      const frame = lastFrame();

      expect(frame).toContain("Standard output");
      expect(frame).toContain("Error: Error output");
    });
  });

  describe("Interactive Command Execution", () => {
    test("executes command with stdin input", async () => {
      const { spawn } = await import("node:child_process");

      const output: string[] = [];
      const child = spawn("cat");

      const inputText = "Hello from stdin";
      child.stdin?.write(`${inputText}\n`);
      child.stdin?.end();

      await new Promise<void>((resolve) => {
        child.stdout?.on("data", (data) => {
          output.push(data.toString().trim());
        });

        child.on("close", () => {
          resolve();
        });
      });

      const StdinOutput = () => (
        <Terminal>
          <Box flexDirection="column">
            <Text color="cyan">Input: {inputText}</Text>
            <Text color="green">Output: {output.join("")}</Text>
          </Box>
        </Terminal>
      );

      const { lastFrame } = render(<StdinOutput />);
      const frame = lastFrame();

      expect(frame).toContain(inputText);
      expect(output.join("")).toContain(inputText);
    });

    test("displays command with exit code", async () => {
      const { spawn } = await import("node:child_process");

      let exitCode = 0;
      const child = spawn("sh", ["-c", "exit 0"]);

      await new Promise<void>((resolve) => {
        child.on("close", (code) => {
          exitCode = code ?? 0;
          resolve();
        });
      });

      const ExitCodeDisplay = () => (
        <Terminal>
          <Box flexDirection="column">
            <Text>Command executed</Text>
            <Text color={exitCode === 0 ? "green" : "red"}>
              Exit code: {exitCode}
            </Text>
          </Box>
        </Terminal>
      );

      const { lastFrame } = render(<ExitCodeDisplay />);
      const frame = lastFrame();

      expect(frame).toContain("Exit code: 0");
      expect(exitCode).toBe(0);
    });
  });

  describe("Error Handling", () => {
    test("handles command execution errors", async () => {
      const { spawn } = await import("node:child_process");

      let errorMessage = "";
      const child = spawn("nonexistent-command-xyz");

      await new Promise<void>((resolve) => {
        child.on("error", (error) => {
          errorMessage = error.message;
          resolve();
        });

        // Resolve after a short timeout if no error occurs
        setTimeout(() => resolve(), 500);
      });

      const ErrorDisplay = () => (
        <Terminal>
          <Box flexDirection="column">
            <Text color="red" bold>
              Error:
            </Text>
            <Text color="red">{errorMessage || "Command not found"}</Text>
          </Box>
        </Terminal>
      );

      const { lastFrame } = render(<ErrorDisplay />);
      const frame = lastFrame();

      expect(frame).toContain("Error");
      expect(errorMessage.length).toBeGreaterThan(0);
    });

    test("handles command with non-zero exit code", async () => {
      const { spawn } = await import("node:child_process");

      let exitCode = 0;
      const child = spawn("sh", ["-c", "exit 42"]);

      await new Promise<void>((resolve) => {
        child.on("close", (code) => {
          exitCode = code ?? 0;
          resolve();
        });
      });

      const ErrorExitDisplay = () => (
        <Terminal>
          <Box flexDirection="column">
            <Text color="red">Command failed</Text>
            <Text color="red">Exit code: {exitCode}</Text>
          </Box>
        </Terminal>
      );

      const { lastFrame } = render(<ErrorExitDisplay />);
      const frame = lastFrame();

      expect(frame).toContain("Command failed");
      expect(frame).toContain("Exit code: 42");
      expect(exitCode).toBe(42);
    });
  });

  describe("ANSI Colors and Formatting", () => {
    test("displays command output with ANSI color codes", async () => {
      const { spawn } = await import("node:child_process");

      const output: string[] = [];
      const child = spawn("sh", [
        "-c",
        'printf "\\033[32mGreen text\\033[0m \\033[31mRed text\\033[0m\\n"',
      ]);

      await new Promise<void>((resolve) => {
        child.stdout?.on("data", (data) => {
          output.push(data.toString());
        });

        child.on("close", () => {
          resolve();
        });
      });

      const ColoredOutput = () => (
        <Terminal>
          <Box flexDirection="column">
            <Text>Command output with colors:</Text>
            <Text>{output.join("")}</Text>
          </Box>
        </Terminal>
      );

      const { lastFrame } = render(<ColoredOutput />);
      const frame = lastFrame();

      expect(frame).toContain("Command output with colors");
      expect(output[0]).toContain("Green text");
      expect(output[0]).toContain("Red text");
    });

    test("displays formatted command output with bold text", async () => {
      const { spawn } = await import("node:child_process");

      const output: string[] = [];
      const child = spawn("sh", [
        "-c",
        'printf "Normal \\033[1mBold\\033[0m text\\n"',
      ]);

      await new Promise<void>((resolve) => {
        child.stdout?.on("data", (data) => {
          output.push(data.toString());
        });

        child.on("close", () => {
          resolve();
        });
      });

      const FormattedOutput = () => (
        <Terminal>
          <Box flexDirection="column">
            <Text>{output.join("")}</Text>
          </Box>
        </Terminal>
      );

      render(<FormattedOutput />);

      expect(output[0]).toContain("Normal");
      expect(output[0]).toContain("Bold");
    });
  });

  describe("Real Command Workflows", () => {
    test("simulates git status workflow", async () => {
      const { execSync } = await import("node:child_process");

      let gitStatus = "";
      try {
        gitStatus = execSync("git status --short", { encoding: "utf8" });
      } catch {
        gitStatus = "Not a git repository";
      }

      const GitStatusDisplay = () => (
        <Terminal>
          <Box flexDirection="column">
            <Text color="cyan" bold>
              Git Status:
            </Text>
            <Text>{gitStatus || "Working tree clean"}</Text>
          </Box>
        </Terminal>
      );

      const { lastFrame } = render(<GitStatusDisplay />);
      const frame = lastFrame();

      expect(frame).toContain("Git Status");
    });

    test("displays multi-command workflow", async () => {
      const { execSync } = await import("node:child_process");

      const commands = [
        { cmd: "echo 'Step 1: Init'", label: "Initialize" },
        { cmd: "echo 'Step 2: Build'", label: "Build" },
        { cmd: "echo 'Step 3: Test'", label: "Test" },
      ];

      const results = commands.map(({ cmd, label }) => ({
        label,
        output: execSync(cmd, { encoding: "utf8" }).trim(),
      }));

      const WorkflowDisplay = () => (
        <Terminal>
          <Box flexDirection="column">
            <Text bold>Workflow Execution:</Text>
            {results.map((result, index) => (
              <Box key={index} flexDirection="column" marginTop={1}>
                <Text color="cyan">→ {result.label}</Text>
                <Text color="green">  {result.output}</Text>
              </Box>
            ))}
          </Box>
        </Terminal>
      );

      const { lastFrame } = render(<WorkflowDisplay />);
      const frame = lastFrame();

      expect(frame).toContain("Workflow Execution");
      expect(frame).toContain("Step 1: Init");
      expect(frame).toContain("Step 2: Build");
      expect(frame).toContain("Step 3: Test");
    });

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
        expect(capturedExitCode).toBe(0);

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
      expect(capturedExitCode).toBe(0);

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
  });
});
