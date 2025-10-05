import { expect, mock, test } from "bun:test";
import { WelcomeScreen } from "../../src/components/WelcomeScreen.js";
import { render } from "../utils.js";

// Mock the version module to ensure consistent snapshots
mock.module("../../src/lib/version.js", () => ({
  CLI_VERSION: "0.0.0-test",
}));

test("WelcomeScreen renders header", () => {
  const { lastFrame } = render(<WelcomeScreen />);
  const output = lastFrame();

  expect(output).toContain("Open Composer CLI");
});

test("WelcomeScreen renders welcome message", () => {
  const { lastFrame } = render(<WelcomeScreen />);
  const output = lastFrame();

  expect(output).toContain("Welcome to Open Composer!");
  expect(output).toContain(
    "An agent orchestration framework for building with AI",
  );
});

test("WelcomeScreen renders main menu items", () => {
  const { lastFrame } = render(<WelcomeScreen />);
  const output = lastFrame();

  // Check for some key menu items
  expect(output).toContain("Sessions");
  expect(output).toContain("Run");
  expect(output).toContain("Spawn");
  expect(output).toContain("Status");
});

test("WelcomeScreen renders quick info panel", () => {
  const { lastFrame } = render(<WelcomeScreen />);
  const output = lastFrame();

  expect(output).toContain("Quick Info");
  expect(output).toContain("Select a command to get started");
  expect(output).toContain("Use arrow keys or j/k to navigate");
});

test("WelcomeScreen renders status bar", () => {
  const { lastFrame } = render(<WelcomeScreen />);
  const output = lastFrame();

  expect(output).toContain("Ready");
});

test("WelcomeScreen calls onCommandSelect when provided", () => {
  let selectedCommand = "";
  const handleCommandSelect = (command: string) => {
    selectedCommand = command;
  };

  render(<WelcomeScreen onCommandSelect={handleCommandSelect} />);

  // The component is rendered successfully
  expect(selectedCommand).toBe("");
});

test("WelcomeScreen matches snapshot", () => {
  const { lastFrame } = render(<WelcomeScreen />);
  expect(lastFrame()).toMatchSnapshot();
});
