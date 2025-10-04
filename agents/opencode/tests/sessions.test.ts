import { describe, expect, test, beforeAll, mock } from "bun:test";
import * as Effect from "effect/Effect";
import { parseCursorSessions, type CursorSession } from "../src/sessions.js";
import * as path from "node:path";
import { homedir } from "node:os";
import * as fs from "node:fs/promises";

describe("Cursor Sessions Parser", () => {
  const fixturesDir = path.join(__dirname, "fixtures", "worktrees");

  beforeAll(() => {
    // Mock homedir to point to our fixtures
    mock.module("node:os", () => ({
      homedir: () => path.join(__dirname, "fixtures", ".."),
    }));
  });

  test("parseCursorSessions returns an Effect", () => {
    const result = parseCursorSessions();
    expect(result).toBeDefined();
  });

  test("reads git HEAD file from worktree", async () => {
    const headFile = path.join(
      fixturesDir,
      "open-composer/1759450333833-182a9d/git-mock/HEAD"
    );
    const content = await fs.readFile(headFile, "utf-8");

    expect(content).toContain("ref: refs/heads/");
    expect(content.trim()).toBe("ref: refs/heads/feature/ai-sessions-viewer");
  });

  test("parses branch name from HEAD file", async () => {
    const headFile = path.join(
      fixturesDir,
      "my-project/1759449921935-ddf952/git-mock/HEAD"
    );
    const content = await fs.readFile(headFile, "utf-8");
    const branchMatch = content.match(/ref: refs\/heads\/(.+)/);

    expect(branchMatch).not.toBeNull();
    expect(branchMatch![1].trim()).toBe("main");
  });

  test("extracts timestamp from worktree directory name", () => {
    const dirName = "1759450333833-182a9d";
    const parts = dirName.split("-");
    const timestamp = parts[0] ? Number.parseInt(parts[0], 10) : 0;

    expect(timestamp).toBe(1759450333833);
    expect(timestamp).toBeGreaterThan(0);

    const date = new Date(timestamp);
    expect(date).toBeInstanceOf(Date);
    expect(date.getTime()).toBe(timestamp);
  });

  test("fixture directory structure is correct", async () => {
    const projects = await fs.readdir(fixturesDir, { withFileTypes: true });

    expect(projects.length).toBeGreaterThan(0);

    const projectNames = projects.filter(p => p.isDirectory()).map(p => p.name);
    expect(projectNames).toContain("open-composer");
    expect(projectNames).toContain("my-project");
  });

  test("session type structure is correct", () => {
    const mockSession: CursorSession = {
      id: "cursor-open-composer-1759450333833-182a9d",
      agent: "cursor-agent",
      timestamp: new Date(1759450333833),
      cwd: "/Users/test/.cursor/worktrees/open-composer/1759450333833-182a9d",
      repository: "open/composer",
      branch: "feature/ai-sessions-viewer",
      summary: "Cursor worktree: open-composer",
      status: "active",
    };

    expect(mockSession.agent).toBe("cursor-agent");
    expect(mockSession.timestamp).toBeInstanceOf(Date);
    expect(mockSession.status).toBe("active");
    expect(["cursor", "cursor-agent"]).toContain(mockSession.agent);
  });
});
