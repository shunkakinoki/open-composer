import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";
import * as Effect from "effect/Effect";
import { SessionsService } from "../../src/services/sessions-service.js";

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

describe("SessionsService", () => {
  let service: SessionsService;

  beforeEach(() => {
    service = new SessionsService();
    mockConsoleLog.mockClear();
    mockFsAccess.mockClear();
    mockReadlineInterface.question.mockClear();
    mockReadlineInterface.close.mockClear();
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
  });

  // TODO: Implement proper database mocking for comprehensive tests
  // The database mocking is complex and requires deep understanding of Drizzle ORM internals
  // For now, we provide a basic test structure that can be expanded later

  it("should instantiate SessionsService", () => {
    expect(service).toBeInstanceOf(SessionsService);
  });

  // Commenting out complex database tests for now
  // These would require extensive mocking of the Drizzle ORM query builder
  /*
  describe("createInteractive", () => {
    it("should create a session with existing workspace", async () => {
      // Test implementation here
    });
  });
  */
});
