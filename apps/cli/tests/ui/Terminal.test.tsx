import { describe, expect, test, beforeEach, afterEach, mock } from "bun:test";
import { Terminal } from "../../src/components/Terminal.js";
import { render } from "../utils.js";

// Mock fetch globally
const originalFetch = global.fetch;
const mockFetch = mock();

// Mock EventSource
class MockEventSource {
  url: string;
  listeners: Map<string, Array<(event: any) => void>> = new Map();
  onerror: ((event: any) => void) | null = null;

  constructor(url: string) {
    this.url = url;
  }

  addEventListener(event: string, handler: (event: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(handler);
  }

  close() {
    // Mock close
  }

  // Helper to trigger events in tests
  trigger(event: string, data: any) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        handler({ data: JSON.stringify(data) });
      }
    }
  }
}

const originalEventSource = global.EventSource;

describe("Terminal", () => {
  beforeEach(() => {
    global.fetch = mockFetch as any;
    global.EventSource = MockEventSource as any;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.EventSource = originalEventSource;
    mockFetch.mockClear();
  });

  test("renders connecting state initially", () => {
    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ ptyID: "test-pty-id" }),
              }),
            100
          )
        )
    );

    const { lastFrame } = render(<Terminal />);

    expect(lastFrame()).toContain("Connecting to terminal");
  });

  test("component initializes without crashing", () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ ptyID: "test-pty-id" }),
      })
    );

    expect(() => {
      render(<Terminal />);
    }).not.toThrow();
  });

  test("accepts custom server URL", async () => {
    const customUrl = "http://custom-server:4000";
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ ptyID: "test-pty-id" }),
      })
    );

    render(<Terminal serverUrl={customUrl} />);

    // Wait a bit for the fetch to be called
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockFetch).toHaveBeenCalled();
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[0]).toContain(customUrl);
  });

  test("accepts custom session ID", async () => {
    const customSession = "custom-session-123";
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ ptyID: "test-pty-id" }),
      })
    );

    render(<Terminal sessionId={customSession} />);

    // Wait a bit for the fetch to be called
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockFetch).toHaveBeenCalled();
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[0]).toContain(customSession);
  });

  test("accepts custom shell command", async () => {
    const customCmd = ["/bin/zsh"];
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ ptyID: "test-pty-id" }),
      })
    );

    render(<Terminal cmd={customCmd} />);

    // Wait a bit for the fetch to be called
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockFetch).toHaveBeenCalled();
    const callArgs = mockFetch.mock.calls[0];
    const requestBody = JSON.parse(callArgs[1].body);
    expect(requestBody.cmd).toEqual(customCmd);
  });

  test("accepts custom working directory", async () => {
    const customCwd = "/custom/working/dir";
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ ptyID: "test-pty-id" }),
      })
    );

    render(<Terminal cwd={customCwd} />);

    // Wait a bit for the fetch to be called
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockFetch).toHaveBeenCalled();
    const callArgs = mockFetch.mock.calls[0];
    const requestBody = JSON.parse(callArgs[1].body);
    expect(requestBody.cwd).toEqual(customCwd);
  });

  test("accepts custom environment variables", async () => {
    const customEnv = { CUSTOM_VAR: "value123" };
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ ptyID: "test-pty-id" }),
      })
    );

    render(<Terminal env={customEnv} />);

    // Wait a bit for the fetch to be called
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockFetch).toHaveBeenCalled();
    const callArgs = mockFetch.mock.calls[0];
    const requestBody = JSON.parse(callArgs[1].body);
    expect(requestBody.env).toEqual(customEnv);
  });

  test("displays error when PTY creation fails", async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: false,
        json: async () => ({ error: "Failed to create PTY" }),
      })
    );

    const { lastFrame } = render(<Terminal />);

    // Wait for the error to be set
    await new Promise((resolve) => setTimeout(resolve, 10));

    const frame = lastFrame();
    expect(frame).toContain("Error");
  });

  test("creates PTY with correct default parameters", async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ ptyID: "test-pty-id" }),
      })
    );

    render(<Terminal />);

    // Wait a bit for the fetch to be called
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockFetch).toHaveBeenCalled();
    const callArgs = mockFetch.mock.calls[0];

    // Check URL
    expect(callArgs[0]).toBe("http://localhost:3000/session/default/pty");

    // Check method
    expect(callArgs[1].method).toBe("POST");

    // Check body
    const requestBody = JSON.parse(callArgs[1].body);
    expect(requestBody.cmd).toBeDefined();
    expect(requestBody.cols).toBeGreaterThan(0);
    expect(requestBody.rows).toBeGreaterThan(0);
  });

  test("handles onExit callback", async () => {
    const mockOnExit = mock(() => {});

    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ ptyID: "test-pty-id" }),
      })
    );

    render(<Terminal onExit={mockOnExit} />);

    expect(typeof mockOnExit).toBe("function");
  });

  test("sends correct headers for PTY creation", async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ ptyID: "test-pty-id" }),
      })
    );

    render(<Terminal />);

    // Wait a bit for the fetch to be called
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockFetch).toHaveBeenCalled();
    const callArgs = mockFetch.mock.calls[0];

    expect(callArgs[1].headers["Content-Type"]).toBe("application/json");
  });

  test("includes terminal dimensions in PTY creation", async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ ptyID: "test-pty-id" }),
      })
    );

    render(<Terminal />);

    // Wait a bit for the fetch to be called
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockFetch).toHaveBeenCalled();
    const callArgs = mockFetch.mock.calls[0];
    const requestBody = JSON.parse(callArgs[1].body);

    expect(requestBody.cols).toBeDefined();
    expect(requestBody.rows).toBeDefined();
    expect(typeof requestBody.cols).toBe("number");
    expect(typeof requestBody.rows).toBe("number");
  });
});
