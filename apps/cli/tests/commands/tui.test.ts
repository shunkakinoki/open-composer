import { beforeEach, describe, expect, it, mock } from "bun:test";
import { Effect } from "effect";
import { buildTUICommand } from "../../src/commands/tui.js";
import { TelemetryService } from "../../src/services/telemetry.js";

// Mock Ink render function
const mockRender = mock(() => ({
  waitUntilExit: mock(() => Promise.resolve()),
}));

// Mock React
const mockReact = {
  createElement: mock(() => ({})),
};

// Create a mock TelemetryService that does nothing
const mockTelemetryService = {
  track: () => Effect.void,
  identify: () => Effect.void,
  capture: () => Effect.void,
  captureException: () => Effect.void,
  flush: () => Effect.void,
  shutdown: () => Effect.void,
};

// Mock telemetry functions that don't require services
const mockTrackCommand = mock(() => Effect.void);
const mockTrackFeatureUsage = mock(() => Effect.void);

// Mock the imports
mock.module("ink", () => ({
  render: mockRender,
}));

mock.module("react", () => mockReact);

// Mock the ComposerApp component
mock.module("../../src/components/ComposerApp.js", () => ({
  ComposerApp: mock(() => null),
}));

mock.module("../../src/services/telemetry.js", () => ({
  trackCommand: mockTrackCommand,
  trackFeatureUsage: mockTrackFeatureUsage,
}));

beforeEach(() => {
  // Reset all mocks
  mockRender.mockClear();
  mockReact.createElement.mockClear();
  mockTrackCommand.mockClear();
  mockTrackFeatureUsage.mockClear();
});

describe("tui command", () => {
  describe("buildTUICommand", () => {
    it("should build TUI command successfully", () => {
      const command = buildTUICommand();
      expect(command).toBeDefined();
      expect(typeof command).toBe("object");
    });
  });

  describe("tui command execution", () => {
    it("should track command and feature usage", async () => {
      const command = buildTUICommand();

      const result = await Effect.runPromise(
        Effect.provideService(
          command.handler({}),
          TelemetryService,
          mockTelemetryService,
        ),
      );

      expect(result).toBeUndefined();
      expect(mockTrackCommand).toHaveBeenCalledWith("tui");
      expect(mockTrackFeatureUsage).toHaveBeenCalledWith("tui_launch");
    });

    it("should render the ComposerApp component", async () => {
      const command = buildTUICommand();

      const result = await Effect.runPromise(
        Effect.provideService(
          command.handler({}),
          TelemetryService,
          mockTelemetryService,
        ),
      );

      expect(result).toBeUndefined();
      expect(mockReact.createElement).toHaveBeenCalled();
      expect(mockRender).toHaveBeenCalled();
    });

    it("should call waitUntilExit on the render result", async () => {
      const command = buildTUICommand();

      const result = await Effect.runPromise(
        Effect.provideService(
          command.handler({}),
          TelemetryService,
          mockTelemetryService,
        ),
      );

      expect(result).toBeUndefined();
      const renderResult = mockRender.mock.results[0]?.value as { waitUntilExit: ReturnType<typeof mock> };
      expect(renderResult.waitUntilExit).toHaveBeenCalled();
    });

    it("should handle render errors", async () => {
      const errorMessage = "Failed to render TUI";
      mockRender.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      const command = buildTUICommand();

      await expect(
        Effect.runPromise(
          Effect.provideService(
            command.handler({}),
            TelemetryService,
            mockTelemetryService,
          ),
        ),
      ).rejects.toThrow(`Failed to start the TUI: ${errorMessage}`);
    });

    it("should handle waitUntilExit errors", async () => {
      const errorMessage = "Wait until exit failed";
      const mockWaitUntilExit = mock(() =>
        Promise.reject(new Error(errorMessage)),
      );
      mockRender.mockReturnValue({
        waitUntilExit: mockWaitUntilExit,
      });

      const command = buildTUICommand();

      await expect(
        Effect.runPromise(
          Effect.provideService(
            command.handler({}),
            TelemetryService,
            mockTelemetryService,
          ),
        ),
      ).rejects.toThrow(`Failed to start the TUI: ${errorMessage}`);
    });
  });
});
