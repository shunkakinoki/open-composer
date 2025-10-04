import { expect, test } from "bun:test";
import { StatusBar } from "../../src/components/StatusBar.js";
import { render } from "../utils.js";

test("StatusBar renders default status", () => {
  const { lastFrame } = render(<StatusBar />);
  const output = lastFrame();

  expect(output).toContain("Ready");
  expect(output).toContain("main");
  expect(output).toContain("claude-code");
});

test("StatusBar renders custom props", () => {
  const { lastFrame } = render(
    <StatusBar
      branch="feature-branch"
      worktree="feature-123"
      agent="cursor-agent"
      status="Building"
    />,
  );
  const output = lastFrame();

  // Check for partial matches since text may be truncated in narrow displays
  expect(output).toMatch(/Build/);
  expect(output).toMatch(/feature-bran/);
  expect(output).toMatch(/feature-12/);
  expect(output).toMatch(/cursor-agen/);
});

test("StatusBar renders help text", () => {
  const { lastFrame } = render(<StatusBar />);
  const output = lastFrame();

  expect(output).toContain("Press");
  expect(output).toContain("q");
  expect(output).toContain("to quit");
  expect(output).toContain("?");
  expect(output).toContain("for help");
});

test("StatusBar matches snapshot with default props", () => {
  const { lastFrame } = render(<StatusBar />);
  expect(lastFrame()).toMatchSnapshot();
});

test("StatusBar matches snapshot with custom props", () => {
  const { lastFrame } = render(
    <StatusBar
      branch="feature-branch"
      worktree="feature-123"
      agent="cursor-agent"
      status="Building"
    />,
  );
  expect(lastFrame()).toMatchSnapshot();
});
