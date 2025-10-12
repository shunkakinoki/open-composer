import { describe, expect, test } from "bun:test";
import React from "react";

import { Sidebar } from "../../src/components/Sidebar.js";
import { render } from "../utils.js";

describe("Sidebar", () => {
  test("renders correctly with worktrees", async () => {
    const worktrees = [
      {
        name: "main",
        path: "/path/to/main",
        branch: "main",
        active: true,
      },
      {
        name: "feature-1",
        path: "/path/to/feature-1",
        branch: "feature-1",
        active: false,
      },
    ];

    const { lastFrame, cleanup } = await render(
      <Sidebar worktrees={worktrees} currentBranch="main" />,
    );
    expect(lastFrame()).toMatchSnapshot();
    cleanup();
  });
});
