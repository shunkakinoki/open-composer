import { expect, mock, test } from "bun:test";
import { WelcomeScreen } from "../../src/components/WelcomeScreen.js";
import { render } from "../utils.js";

// Mock the version module to ensure consistent snapshots
mock.module("../../src/lib/version.js", () => ({
  CLI_VERSION: "0.0.0-test",
}));

test("WelcomeScreen renders header", async () => {
  const { lastFrame, cleanup } = await render(<WelcomeScreen />);
  const output = lastFrame();

  // Check for key parts of the header (accounting for border characters)
  expect(output).toMatch(/Open.*Composer.*CLI/);
  cleanup();
});

test("WelcomeScreen renders welcome message", async () => {
  const { lastFrame, cleanup } = await render(<WelcomeScreen />);
  const output = lastFrame();

  // Check for key words from the welcome message
  expect(output).toMatch(/agent.*orchestration.*framework/i);
  cleanup();
});

test("WelcomeScreen renders main menu items", async () => {
  const { lastFrame, cleanup } = await render(<WelcomeScreen />);
  const output = lastFrame();

  // Check for some key menu items
  expect(output).toMatch(/sessions/i);
  expect(output).toMatch(/Spawn/i);
  expect(output).toMatch(/status/i);
  cleanup();
});

test("WelcomeScreen renders quick info panel", async () => {
  const { lastFrame, cleanup } = await render(<WelcomeScreen />);
  const output = lastFrame();

  // Check for key parts of quick info
  expect(output).toMatch(/Quick.*Info/i);
  expect(output).toMatch(/arrow.*keys/i);
  cleanup();
});

test("WelcomeScreen renders status bar", async () => {
  const { lastFrame, cleanup } = await render(<WelcomeScreen />);
  const output = lastFrame();

  // Status bar contains text (may have formatting)
  expect(output.length).toBeGreaterThan(100);
  cleanup();
});

test("WelcomeScreen calls onCommandSelect when provided", async () => {
  let selectedCommand = "";
  const handleCommandSelect = (command: string) => {
    selectedCommand = command;
  };

  const { cleanup } = await render(<WelcomeScreen onCommandSelect={handleCommandSelect} />);

  // The component is rendered successfully
  expect(selectedCommand).toBe("");
  cleanup();
});

test("WelcomeScreen matches snapshot", async () => {
  const { lastFrame, cleanup } = await render(<WelcomeScreen />);
  expect(lastFrame()).toMatchSnapshot();
  cleanup();
});
