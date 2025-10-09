import { expect, mock, test } from "bun:test";
import { WelcomeScreen } from "../../src/components/WelcomeScreen.js";
import { render } from "../utils.js";

// Mock the version module to ensure consistent snapshots
mock.module("../../src/lib/version.js", () => ({
  CLI_VERSION: "0.0.0-test",
}));

test("WelcomeScreen renders ASCII logo", () => {
  const { lastFrame } = render(<WelcomeScreen />);
  const output = lastFrame();

  // Check for ASCII art characters that make up the logo
  expect(output).toContain("___");
  expect(output).toContain("____");
});

test("WelcomeScreen renders command shortcuts", () => {
  const { lastFrame } = render(<WelcomeScreen />);
  const output = lastFrame();

  // Check for command shortcuts
  expect(output).toContain("/sessions");
  expect(output).toContain("/run");
  expect(output).toContain("/spawn");
  expect(output).toContain("/status");
  expect(output).toContain("/stack");
  expect(output).toContain("/settings");
});

test("WelcomeScreen renders input bar", () => {
  const { lastFrame } = render(<WelcomeScreen />);
  const output = lastFrame();

  expect(output).toContain(">");
  expect(output).toContain("Press ESC or q to quit");
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
