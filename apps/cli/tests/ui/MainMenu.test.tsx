import { expect, test } from "bun:test";
import { MainMenu, type MenuItem } from "../../src/components/MainMenu.js";
import { render } from "../utils.js";

test("MainMenu renders menu items", () => {
  const mockItems: MenuItem[] = [
    {
      key: "test1",
      label: "Test 1",
      description: "First test item",
      onSelect: () => {},
    },
    {
      key: "test2",
      label: "Test 2",
      description: "Second test item",
      onSelect: () => {},
    },
  ];

  const { lastFrame } = render(
    <MainMenu items={mockItems} onExit={() => {}} />,
  );

  const output = lastFrame();

  // Check that menu title is present
  expect(output).toContain("Main Menu");

  // Check that menu items are rendered
  expect(output).toContain("Test 1");
  expect(output).toContain("First test item");
  expect(output).toContain("Test 2");
  expect(output).toContain("Second test item");

  // Check that navigation hints are present
  expect(output).toContain("Use ↑↓/j/k to navigate");
});

test("MainMenu renders with numbered items", () => {
  const mockItems: MenuItem[] = [
    {
      key: "first",
      label: "First",
      description: "First item",
      onSelect: () => {},
    },
  ];

  const { lastFrame } = render(
    <MainMenu items={mockItems} onExit={() => {}} />,
  );

  const output = lastFrame();

  // Check that item has number label
  expect(output).toContain("[1]");
});

test("MainMenu matches snapshot", () => {
  const mockItems: MenuItem[] = [
    {
      key: "sessions",
      label: "Sessions",
      description: "List all sessions",
      onSelect: () => {},
    },
    {
      key: "cache",
      label: "Cache",
      description: "Manage cache",
      onSelect: () => {},
    },
    {
      key: "worktree",
      label: "Worktree",
      description: "Manage worktrees",
      onSelect: () => {},
    },
  ];

  const { lastFrame } = render(
    <MainMenu items={mockItems} onExit={() => {}} />,
  );

  expect(lastFrame()).toMatchSnapshot();
});
