# Terminal Component

A React/Ink component that provides an interactive terminal interface connecting to the OpenComposer PTY server.

## Overview

The `Terminal` component creates a full-featured terminal emulator in the CLI using:
- **Ink**: For rendering the terminal UI in the CLI
- **xterm.js (headless)**: For terminal emulation and buffer management
- **Server-Sent Events (SSE)**: For real-time streaming of terminal output
- **Fetch API**: For sending input and control commands

## Architecture

```
┌─────────────────────┐
│   Terminal.tsx      │  ← Ink React Component
│   (CLI Client)      │
└──────────┬──────────┘
           │
           │ HTTP/SSE
           │
┌──────────▼──────────┐
│   PTY Routes        │  ← Elysia HTTP Endpoints
│   (apps/server)     │
└──────────┬──────────┘
           │
           │
┌──────────▼──────────┐
│   PTY Service       │  ← Bun Subprocess + xterm
│   (apps/server)     │
└──────────┬──────────┘
           │
           │
      [ Shell Process ]  ← bash/zsh/etc
```

## Features

### 1. Server-Managed PTY Sessions
- PTY processes run on the server, not the client
- Persistent sessions that can be reconnected
- Multiple clients can attach to the same PTY

### 2. Real-Time Streaming
- Server-Sent Events (SSE) for low-latency output streaming
- Initial snapshot for instant rendering
- Incremental updates for live terminal output

### 3. Full Terminal Emulation
- ANSI escape sequence support
- Scrollback buffer (5000 lines)
- Proper handling of special keys (arrows, Ctrl+C, etc.)

### 4. Dynamic Resizing
- Automatically resizes when terminal size changes
- Syncs both client and server terminal buffers

## Usage

### Basic Usage

```typescript
import { Terminal } from "./components/Terminal.js";

// Render a terminal with default settings
<Terminal />
```

### Advanced Usage

```typescript
<Terminal
  serverUrl="http://localhost:3000"
  sessionId="my-session"
  cmd={["/bin/zsh"]}
  cwd="/home/user/project"
  env={{ CUSTOM_VAR: "value" }}
  onExit={(code) => console.log(`Exited with code ${code}`)}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `serverUrl` | `string` | `"http://localhost:3000"` | Server URL for PTY endpoints |
| `sessionId` | `string` | `"default"` | Session ID for the PTY |
| `cmd` | `string[]` | `[process.env.SHELL \|\| "/bin/bash"]` | Shell command to execute |
| `cwd` | `string` | `process.cwd()` | Working directory |
| `env` | `Record<string, string>` | `{}` | Environment variables |
| `onExit` | `(code: number) => void` | `undefined` | Callback when terminal exits |

## Terminal Command

The terminal functionality is exposed via the `terminal` CLI command:

```bash
# Launch terminal with defaults
oc terminal

# Specify custom server
oc terminal --server http://localhost:4000

# Specify session ID
oc terminal --session my-session

# Use custom shell
oc terminal --shell /bin/zsh

# Set working directory
oc terminal --cwd /path/to/dir
```

## Server Endpoints

The Terminal component communicates with these server endpoints:

### Create PTY
```
POST /session/:sid/pty
Body: { cmd, cwd, env, cols, rows }
Response: { ptyID }
```

### Stream Output
```
GET /session/:sid/pty/:id/stream
Response: SSE stream with:
  - snapshot event (initial state)
  - data events (incremental output)
  - exit event (process terminated)
```

### Send Input
```
POST /session/:sid/pty/:id/input
Body: { data }
```

### Resize Terminal
```
POST /session/:sid/pty/:id/resize
Body: { cols, rows }
```

### Delete PTY
```
DELETE /session/:sid/pty/:id
```

## Key Bindings

The terminal supports standard terminal key bindings:

- **Enter**: Send line
- **Backspace/Delete**: Delete character
- **Arrow Keys**: Navigate
- **Ctrl+C**: Send interrupt signal
- **Ctrl+D**: Send EOF
- **Ctrl+Z**: Suspend process
- **Ctrl+A**: Move to beginning of line
- **Ctrl+E**: Move to end of line
- **Ctrl+K**: Kill to end of line
- **Ctrl+U**: Kill to beginning of line
- **Ctrl+W**: Kill previous word
- **Ctrl+L**: Clear screen
- **Tab**: Tab completion

## Testing

### Component Tests

```bash
bun test tests/ui/Terminal.test.tsx
```

Tests cover:
- Component rendering
- PTY creation with various options
- Error handling
- Props validation
- Connection lifecycle

### Command Tests

```bash
bun test tests/commands/terminal.test.ts
```

Tests cover:
- Command structure
- Options and defaults
- Metadata
- Effect CLI integration

### Server Integration Tests

```bash
bun --filter @open-composer/server test
```

The server includes 80+ E2E tests for PTY functionality covering:
- PTY lifecycle (create, use, destroy)
- Input/output streaming
- Snapshots and serialization
- Concurrent sessions
- Error handling
- Resource cleanup

## Implementation Details

### Client-Side Buffer Management

The component uses `@xterm/headless` to maintain a local terminal buffer that mirrors the server's state. This enables:
- Fast rendering without server round-trips
- Proper ANSI escape sequence handling
- Scrollback support

### Server-Side Persistence

The server maintains the authoritative terminal state using:
- Bun's native subprocess for the shell process
- xterm headless terminal for buffer management
- Serialization addon for snapshot/restore

### Event Flow

1. **Initialize**: Component mounts → Create PTY on server → Receive PTY ID
2. **Connect**: Open SSE stream → Receive snapshot → Apply to local buffer
3. **Input**: User types → Send to server → Server writes to PTY stdin
4. **Output**: PTY stdout → Server terminal buffer → Broadcast to SSE clients → Local terminal buffer → Render
5. **Exit**: Process exits → Server sends exit event → Close connection → Call onExit callback
6. **Cleanup**: Component unmounts → Delete PTY on server

## Error Handling

The component handles various error scenarios:
- Server unreachable: Shows "Connecting to terminal..." indefinitely
- PTY creation failure: Shows error message
- Connection lost: Shows "Lost connection to terminal"
- Process exit: Calls onExit callback with exit code

## Performance Considerations

- **Snapshot-first**: Initial snapshot enables instant rendering
- **Incremental updates**: Only new data is sent after snapshot
- **Local buffering**: Terminal buffer is maintained client-side for fast rendering
- **Efficient streaming**: SSE provides low-latency, one-way streaming

## References

- [Server PTY Implementation](../../../server/src/routes/pty.ts)
- [Server PTY Service](../../../server/src/services/pty-service.ts)
- [Terminal Command](../commands/terminal-command.ts)
- [OpenCode Architecture](https://opencode.ai/docs/server/)
- [xterm.js](https://github.com/xtermjs/xterm.js)
- [Ink](https://github.com/vadimdemedes/ink)
