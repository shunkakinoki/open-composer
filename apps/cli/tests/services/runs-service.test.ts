import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";
import type { Session } from "@open-composer/db";
import * as Effect from "effect/Effect";
import { RunsService } from "../../src/services/runs-service.js";
import { createMockSqliteDrizzle } from "../helpers/db-mock.js";

// Mock file system operations
const mockFsAccess = mock(async (path: string) => {
  if (path.includes("invalid")) {
    throw new Error("ENOENT");
  }
  // Allow access for valid paths
});

const mockReadlineInterface = {
  question: mock((query: string, callback: (answer: string) => void) => {
    if (query.includes("session name")) {
      callback("test-session");
    } else if (query.includes("workspace option")) {
      callback("1"); // Choose existing workspace
    } else if (query.includes("workspace")) {
      callback("/valid/workspace/path");
    } else if (query.includes("choice")) {
      callback("1"); // Choose existing workspace
    } else {
      callback("");
    }
  }),
  close: mock(() => {}),
};

const mockReadline = {
  createInterface: mock(() => mockReadlineInterface),
};

mock.module("node:fs/promises", () => ({
  access: mockFsAccess,
}));

mock.module("node:readline", () => mockReadline);

mock.module("../../src/services/stack-service", () => ({
  StackService: class {
    create(name: string) {
      return Effect.succeed(`Created stack branch ${name}`);
    }
  },
}));

// Mock console.log
const mockConsoleLog = spyOn(console, "log");

describe("RunsService", () => {
  let service: RunsService;
  let mockDbSetup: ReturnType<typeof createMockSqliteDrizzle>;

  beforeEach(() => {
    service = new RunsService();
    mockDbSetup = createMockSqliteDrizzle();
    mockConsoleLog.mockClear();
    mockFsAccess.mockClear();
    mockReadlineInterface.question.mockClear();
    mockReadlineInterface.close.mockClear();
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
  });

  test.serial("should instantiate RunsService", () => {
    expect(service).toBeInstanceOf(RunsService);
  });

  describe("createInteractive", () => {
    test.serial("should create a session with existing workspace", async () => {
      mockDbSetup.mockDb._resetId();
      const sessionName = "test-session";
      const workspacePath = "/test/workspace";

      const program = service.createInteractive(
        sessionName,
        "existing",
        workspacePath,
      );

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(mockDbSetup.layer)),
      );

      expect(result).toBe(1);
      expect(mockDbSetup.mockDb._storage.sessions).toHaveLength(1);
      expect(mockDbSetup.mockDb._storage.sessions[0]).toMatchObject({
        id: 1,
        name: sessionName,
        workspacePath,
        status: "active",
      });
    });

    test.serial("should create a session without workspace", async () => {
      mockDbSetup = createMockSqliteDrizzle();
      const sessionName = "test-session-no-workspace";

      const program = service.createInteractive(sessionName, "none");

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(mockDbSetup.layer)),
      );

      expect(result).toBe(1);
      expect(mockDbSetup.mockDb._storage.sessions).toHaveLength(1);
      expect(mockDbSetup.mockDb._storage.sessions[0]).toMatchObject({
        id: 1,
        name: sessionName,
        workspacePath: null,
        status: "active",
      });
    });

    test.serial(
      "should throw error when workspace path is missing for existing option",
      async () => {
        mockDbSetup = createMockSqliteDrizzle();
        const program = service.createInteractive("test-session", "existing");

        await expect(
          Effect.runPromise(program.pipe(Effect.provide(mockDbSetup.layer))),
        ).rejects.toThrow(
          "Workspace path is required for existing or create options",
        );
      },
    );

    test.serial(
      "should throw error when workspace is not a valid git repository",
      async () => {
        mockDbSetup = createMockSqliteDrizzle();
        const program = service.createInteractive(
          "test-session",
          "existing",
          "/invalid/workspace",
        );

        await expect(
          Effect.runPromise(program.pipe(Effect.provide(mockDbSetup.layer))),
        ).rejects.toThrow("is not a valid git repository");
      },
    );
  });

  describe("list", () => {
    test.serial("should list all sessions", async () => {
      mockDbSetup = createMockSqliteDrizzle();

      // Pre-populate with sessions
      mockDbSetup.mockDb._storage.sessions = [
        {
          id: 1,
          name: "Session 1",
          workspacePath: "/path/1",
          description: "First session",
          status: "active",
          createdAt: new Date("2024-01-01").toISOString(),
          updatedAt: new Date("2024-01-01").toISOString(),
        },
        {
          id: 2,
          name: "Session 2",
          workspacePath: null,
          description: "Second session",
          status: "archived",
          createdAt: new Date("2024-01-02").toISOString(),
          updatedAt: new Date("2024-01-02").toISOString(),
        },
      ];

      const program = service.list();

      // Should complete successfully and list sessions
      await expect(
        Effect.runPromise(program.pipe(Effect.provide(mockDbSetup.layer))),
      ).resolves.toBeUndefined();
    });

    test.serial("should show message when no sessions exist", async () => {
      mockDbSetup = createMockSqliteDrizzle();

      const program = service.list();

      // Should complete without error even when no sessions exist
      await expect(
        Effect.runPromise(program.pipe(Effect.provide(mockDbSetup.layer))),
      ).resolves.toBeUndefined();
    });
  });

  describe("switch", () => {
    test.serial("should switch to a session", async () => {
      mockDbSetup = createMockSqliteDrizzle();

      // Pre-populate with sessions
      mockDbSetup.mockDb._storage.sessions = [
        {
          id: 1,
          name: "Session 1",
          workspacePath: "/path/1",
          description: "First session",
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 2,
          name: "Session 2",
          workspacePath: "/path/2",
          description: "Second session",
          status: "inactive",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const program = service.switch(2);

      await Effect.runPromise(program.pipe(Effect.provide(mockDbSetup.layer)));

      // Verify session 1 is inactive and session 2 is active
      const session1 = mockDbSetup.mockDb._storage.sessions.find(
        (s: Session) => s.id === 1,
      );
      const session2 = mockDbSetup.mockDb._storage.sessions.find(
        (s: Session) => s.id === 2,
      );

      expect(session1?.status).toBe("inactive");
      expect(session2?.status).toBe("active");
    });

    test.serial("should handle non-existent session", async () => {
      mockDbSetup = createMockSqliteDrizzle();

      const program = service.switch(999);

      // Should complete without error even for non-existent session
      await expect(
        Effect.runPromise(program.pipe(Effect.provide(mockDbSetup.layer))),
      ).resolves.toBeUndefined();
    });
  });

  describe("archive", () => {
    test.serial("should archive a session", async () => {
      mockDbSetup = createMockSqliteDrizzle();

      // Pre-populate with a session
      mockDbSetup.mockDb._storage.sessions = [
        {
          id: 1,
          name: "Session 1",
          workspacePath: "/path/1",
          description: "First session",
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const program = service.archive(1);

      await Effect.runPromise(program.pipe(Effect.provide(mockDbSetup.layer)));

      const session = mockDbSetup.mockDb._storage.sessions.find(
        (s: Session) => s.id === 1,
      );
      expect(session?.status).toBe("archived");
    });

    test.serial("should handle non-existent session", async () => {
      mockDbSetup = createMockSqliteDrizzle();

      const program = service.archive(999);

      // Should complete without error even for non-existent session
      await expect(
        Effect.runPromise(program.pipe(Effect.provide(mockDbSetup.layer))),
      ).resolves.toBeUndefined();
    });
  });

  describe("delete", () => {
    test.serial("should delete a session", async () => {
      mockDbSetup = createMockSqliteDrizzle();

      // Pre-populate with a session
      mockDbSetup.mockDb._storage.sessions = [
        {
          id: 1,
          name: "Session 1",
          workspacePath: "/path/1",
          description: "First session",
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const program = service.delete(1);

      await Effect.runPromise(program.pipe(Effect.provide(mockDbSetup.layer)));

      expect(mockDbSetup.mockDb._storage.sessions).toHaveLength(0);
    });

    test.serial("should handle non-existent session", async () => {
      mockDbSetup = createMockSqliteDrizzle();

      const program = service.delete(999);

      // Should complete without error even for non-existent session
      await expect(
        Effect.runPromise(program.pipe(Effect.provide(mockDbSetup.layer))),
      ).resolves.toBeUndefined();
    });
  });
});
