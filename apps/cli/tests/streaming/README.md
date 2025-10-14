# Terminal Streaming Tests

Comprehensive test suite for streaming command output through WebSocket to xterm terminals using `@xterm/addon-attach`.

## Overview

This test suite demonstrates how to:
- Stream process output through WebSocket connections
- Use xterm.js in headless mode for testing
- Attach xterm terminals to WebSocket streams with `@xterm/addon-attach`
- Test real command execution with terminal emulation
- Handle ANSI escape codes and colored output

## Architecture

```
┌─────────────────┐
│  Command/Process │
│   (spawn/exec)   │
└────────┬─────────┘
         │ stdout/stderr
         ▼
┌─────────────────┐
│ WebSocket Server│
│  (broadcasts)   │
└────────┬─────────┘
         │ ws://
         ▼
┌─────────────────┐
│  XTerm Terminal │
│   (headless)    │
│ + addon-attach  │
└─────────────────┘
```

## Files

### Utilities

- **`websocket-server.ts`** - WebSocket server utilities
  - Create streaming servers with random ports
  - Manage client connections
  - Broadcast messages to all clients
  - Client connection helpers

- **`xterm-headless.ts`** - Headless xterm terminal utilities
  - Create terminals without DOM dependencies
  - Attach terminals to WebSocket streams
  - Wait for text/lines utilities
  - Buffer access and output capture

### Tests

- **`websocket-streaming.test.ts`** (10 tests)
  - WebSocket server creation and configuration
  - Client connections and disconnections
  - Message broadcasting
  - Binary data handling
  - ANSI escape code transmission

- **`xterm-streaming.test.ts`** (19 tests)
  - Headless terminal creation and configuration
  - Terminal writing and output capture
  - WebSocket streaming integration
  - ANSI escape code processing
  - Wait utilities

- **`run-command-streaming.test.ts`** (16 tests)
  - Real command execution
  - stdout/stderr streaming
  - Process control (termination, timeout)
  - Complex scenarios (build, test, git commands)
  - Error handling

## Test Results

```
✓ 45 tests passing
✓ 81 expect() calls
✓ 0 failures
✓ Run time: ~70s
```

### Coverage by Category

- **WebSocket Streaming**: 10 tests
- **XTerm Integration**: 19 tests
- **Command Execution**: 16 tests

## Usage Examples

### Creating a Streaming Server

```typescript
import { createStreamingServer } from "./websocket-server.js";

const server = await createStreamingServer({ port: 3000 });
console.log(`Streaming at: ${server.url}`);

// Broadcast to all clients
server.broadcast("Hello, clients!\r\n");

// Clean up
await server.close();
```

### Creating a Headless Terminal

```typescript
import { createHeadlessTerminal } from "./xterm-headless.js";

const terminal = await createHeadlessTerminal({
  cols: 80,
  rows: 24,
});

terminal.write("Hello, Terminal!\r\n");
const lines = terminal.getLines();
console.log(lines);

terminal.dispose();
```

### Streaming Command Output

```typescript
import { spawn } from "node:child_process";
import { createStreamingServer } from "./websocket-server.js";
import { createStreamingTerminal } from "./xterm-headless.js";

// Create server
const server = await createStreamingServer();

// Create terminal connected to server
const terminal = await createStreamingTerminal(server.url);

// Run command and stream output
const child = spawn("echo", ["Hello, World!"]);

child.stdout?.on("data", (data) => {
  server.broadcast(data.toString());
});

// Terminal will display the output
await waitForText(terminal, "Hello, World!", 2000);

// Clean up
terminal.dispose();
await server.close();
```

### Attaching to WebSocket

```typescript
import { Terminal } from "@xterm/xterm";
import { AttachAddon } from "@xterm/addon-attach";
import WebSocket from "ws";

const terminal = new Terminal();
const ws = new WebSocket("ws://localhost:3000/stream");

const attachAddon = new AttachAddon(ws);
terminal.loadAddon(attachAddon);

// Terminal is now connected to WebSocket
```

## Key Features

### 1. WebSocket Streaming

- Random port allocation for parallel tests
- Client connection tracking
- Message broadcasting to multiple clients
- Binary data support
- Graceful shutdown with timeouts

### 2. Headless Terminal

- No DOM/browser dependencies required
- Full xterm.js functionality
- Buffer access for testing
- Output capture and validation
- Resize support

### 3. Command Streaming

- Real process execution
- stdout/stderr separation
- ANSI color preservation
- Exit code handling
- Process termination
- Timeout management

### 4. Wait Utilities

- `waitForText()` - Wait for specific text in output
- `waitForLines()` - Wait for line count
- Configurable timeouts
- Non-blocking checks

## API Reference

### WebSocket Server

```typescript
interface StreamingServerHandle {
  server: HTTPServer;
  wss: WebSocketServer;
  port: number;
  url: string;
  broadcast: (data: string) => void;
  close: () => Promise<void>;
  getClients: () => Set<WebSocket>;
}

createStreamingServer(options?: {
  port?: number;
  path?: string;
}): Promise<StreamingServerHandle>

createStreamingClient(url: string): Promise<WebSocket>

collectMessages(
  ws: WebSocket,
  timeout?: number
): Promise<string[]>
```

### Headless Terminal

```typescript
interface HeadlessTerminal {
  terminal: Terminal;
  output: string[];
  write: (data: string) => void;
  resize: (cols: number, rows: number) => void;
  getOutput: () => string;
  getLines: () => string[];
  clear: () => void;
  dispose: () => void;
}

createHeadlessTerminal(options?: {
  cols?: number;
  rows?: number;
}): Promise<HeadlessTerminal>

createStreamingTerminal(
  wsUrl: string,
  options?: HeadlessTerminalOptions
): Promise<HeadlessTerminal>

attachTerminalToWebSocket(
  terminal: Terminal,
  ws: WebSocket
): Promise<void>

waitForText(
  terminal: HeadlessTerminal,
  expectedText: string,
  timeout?: number
): Promise<boolean>

waitForLines(
  terminal: HeadlessTerminal,
  lineCount: number,
  timeout?: number
): Promise<boolean>
```

## Testing Patterns

### Pattern 1: Basic Streaming

```typescript
test("streams output", async () => {
  const server = await createStreamingServer();
  const terminal = await createStreamingTerminal(server.url);

  server.broadcast("Test message\r\n");

  const received = await waitForText(terminal, "Test message", 2000);
  expect(received).toBe(true);

  terminal.dispose();
  await server.close();
});
```

### Pattern 2: Command Execution

```typescript
test("executes command", async () => {
  const server = await createStreamingServer();
  const terminal = await createStreamingTerminal(server.url);

  const child = spawn("echo", ["Hello"]);
  child.stdout?.on("data", (data) => server.broadcast(data.toString()));

  await waitForText(terminal, "Hello", 2000);

  terminal.dispose();
  await server.close();
});
```

### Pattern 3: Error Handling

```typescript
test("handles errors", async () => {
  const server = await createStreamingServer();
  const terminal = await createStreamingTerminal(server.url);

  const child = spawn("nonexistent");
  child.on("error", (error) => {
    server.broadcast(`Error: ${error.message}\r\n`);
  });

  const received = await waitForText(terminal, "Error:", 2000);
  expect(received).toBe(true);

  terminal.dispose();
  await server.close();
});
```

## Dependencies

```json
{
  "@xterm/xterm": "^5.5.0",
  "@xterm/addon-attach": "^0.11.0",
  "ws": "^8.18.3",
  "@types/ws": "^8.18.1"
}
```

## Running Tests

```bash
# Run all streaming tests
bun test tests/streaming

# Run specific test file
bun test tests/streaming/websocket-streaming.test.ts

# Run with longer timeout
bun test tests/streaming --timeout 15000

# Run with coverage
bun test tests/streaming --coverage
```

## Real-World Use Cases

### 1. Build Tool Integration

Stream output from build tools (webpack, vite, tsc):

```typescript
const child = spawn("tsc", ["--watch"]);
child.stdout?.on("data", (data) => server.broadcast(data.toString()));
```

### 2. Test Runner Display

Show test execution in real-time:

```typescript
const child = spawn("bun", ["test"]);
child.stdout?.on("data", (data) => server.broadcast(data.toString()));
```

### 3. Git Operations

Stream git command output:

```typescript
const child = spawn("git", ["pull", "origin", "main"]);
child.stdout?.on("data", (data) => server.broadcast(data.toString()));
```

### 4. Package Managers

Show npm/bun install progress:

```typescript
const child = spawn("bun", ["install"]);
child.stdout?.on("data", (data) => server.broadcast(data.toString()));
```

### 5. Long-Running Processes

Monitor daemons and servers:

```typescript
const child = spawn("npm", ["run", "dev"]);
child.stdout?.on("data", (data) => server.broadcast(data.toString()));
```

## Performance Considerations

1. **Buffer Management**: Terminals manage screen buffers efficiently
2. **Message Batching**: Consider batching rapid output for better performance
3. **Client Limits**: Monitor number of connected clients
4. **Memory Usage**: Clear terminal buffers when not needed
5. **Timeout Handling**: Always use timeouts for wait operations

## Best Practices

1. **Always clean up resources**
   ```typescript
   afterEach(async () => {
     terminal?.dispose();
     await server?.close();
   });
   ```

2. **Use appropriate timeouts**
   ```typescript
   await waitForText(terminal, "expected", 2000); // 2 second timeout
   ```

3. **Handle both stdout and stderr**
   ```typescript
   child.stdout?.on("data", (data) => server.broadcast(data.toString()));
   child.stderr?.on("data", (data) =>
     server.broadcast(`\x1b[31m${data.toString()}\x1b[0m`)
   );
   ```

4. **Wait for connections to stabilize**
   ```typescript
   await new Promise(resolve => setTimeout(resolve, 100));
   ```

5. **Use ANSI codes for colored output**
   ```typescript
   server.broadcast("\x1b[32mSuccess!\x1b[0m\r\n"); // Green
   server.broadcast("\x1b[31mError!\x1b[0m\r\n");   // Red
   ```

## Troubleshooting

### Tests timing out

Increase timeout in test configuration:
```typescript
bun test --timeout 15000
```

### WebSocket connection failures

Check that server is started before creating clients:
```typescript
await new Promise(resolve => setTimeout(resolve, 100));
```

### Terminal not receiving output

Ensure WebSocket connection is established:
```typescript
if (ws.readyState === 1) { // WebSocket.OPEN
  // Connection ready
}
```

### ANSI codes not working

Make sure terminal is processing them:
```typescript
terminal.write("\x1b[31mRed\x1b[0m"); // Include reset code
```

## References

- [xterm.js Documentation](https://xtermjs.org/)
- [addon-attach Source](https://github.com/xtermjs/xterm.js/tree/master/addons/addon-attach)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Node.js child_process](https://nodejs.org/api/child_process.html)

## License

MIT - Same as open-composer project
