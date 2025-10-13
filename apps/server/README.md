# OpenComposer Server

Server-first terminal session manager with persistent snapshots and instant recovery over HTTP/SSE.

## Overview

OpenComposer Server implements the PTY + persistent session integration design for OpenCode, providing a server-managed PTY service with:

- **Server-first architecture**: Single point of execution for all terminal sessions
- **Persistent snapshots**: Instant recovery using xterm serialization
- **Real-time streaming**: Live PTY output over Server-Sent Events (SSE)
- **Session management**: Multi-session support with automatic cleanup
- **Bun-native**: Uses Bun's subprocess API, no native dependencies required

## Quick Start

```bash
# Install dependencies
bun install

# Start the server
bun run dev

# Or start the server on a custom port
bun run dev --port 3001
```

The server will start on port 3000 by default.

## Architecture

### Server-First Model

The TUI is a thin client that sends HTTP requests to the server and receives real-time updates over SSE. All tools (bash, edit, webfetch, etc.) and providers run on the server. Results are persisted and streamed to clients.

```
┌─────────────┐         HTTP/SSE          ┌──────────────┐
│  TUI/IDE    │ ◄────────────────────────► │    Server    │
│  (Client)   │    Thin client,            │              │
│             │    display only            │  ┌────────┐  │
└─────────────┘                            │  │  PTY   │  │
                                           │  │Service │  │
┌─────────────┐                            │  └────────┘  │
│  Browser    │                            │              │
│  (Client)   │ ◄────────────────────────► │  ┌────────┐  │
└─────────────┘                            │  │ xterm  │  │
                                           │  │headless│  │
                                           │  └────────┘  │
                                           └──────────────┘
```

### PTY Architecture

Each PTY session consists of:

1. **Subprocess**: Bun.spawn or node-pty process running the shell
2. **Headless Terminal**: @xterm/headless buffer for scrollback and rendering
3. **Serialization**: @xterm/addon-serialize for instant snapshots
4. **Streaming**: SSE for real-time output delivery

## API Reference

### Create PTY

Create a new PTY session.

```http
POST /session/:sid/pty
Content-Type: application/json

{
  "cmd": ["bash", "-l"],
  "cwd": "/home/user",
  "env": { "CUSTOM_VAR": "value" },
  "cols": 80,
  "rows": 24
}
```

Response:

```json
{
  "ptyID": "uuid-here"
}
```

### Stream PTY Output

Get real-time PTY output via Server-Sent Events.

```http
GET /session/:sid/pty/:id/stream
```

SSE Events:

```
event: snapshot
data: {"data": "...serialized terminal state..."}

event: data
data: {"data": "...incremental output..."}

event: exit
data: {"code": 0}
```

### Write Input

Send input to the PTY (keyboard, commands, etc.).

```http
POST /session/:sid/pty/:id/input
Content-Type: application/json

{
  "data": "echo hello\n"
}
```

### Resize PTY

Resize the terminal dimensions.

```http
POST /session/:sid/pty/:id/resize
Content-Type: application/json

{
  "cols": 120,
  "rows": 40
}
```

### Get Snapshot

Get a serialized snapshot of the terminal state for instant recovery.

```http
GET /session/:sid/pty/:id/snapshot
```

Response:

```json
{
  "data": "...serialized terminal state..."
}
```

### Delete PTY

Kill a specific PTY.

```http
DELETE /session/:sid/pty/:id
```

### List PTYs

List all PTYs for a session.

```http
GET /session/:sid/pty
```

Response:

```json
{
  "ptys": ["uuid-1", "uuid-2"]
}
```

### Delete All Session PTYs

Kill all PTYs for a session.

```http
DELETE /session/:sid/pty
```

## Implementation Details

### Bun-Native Subprocess

OpenComposer Server uses Bun's native `Bun.spawn()` API with stdio pipes:

**Features**:
- No native dependencies (no node-pty)
- No segmentation faults
- Pure Bun implementation
- Simple cross-platform deployment
- Fast process spawning

**Limitations**:
- Uses pipes instead of true PTY
- No terminal resize signal to subprocess (terminal buffer is resized)
- Some terminal features may not work (e.g., raw mode, signals)

**Best for**: Most use cases where you need command execution with output capture. The headless xterm terminal provides a consistent rendering layer regardless of the subprocess limitations.

## Client Examples

### JavaScript/TypeScript

```typescript
// Create a PTY
const response = await fetch('http://localhost:3000/session/my-session/pty', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    cmd: ['bash', '-l'],
    cols: 80,
    rows: 24,
  }),
})
const { ptyID } = await response.json()

// Stream output
const eventSource = new EventSource(
  `http://localhost:3000/session/my-session/pty/${ptyID}/stream`
)

eventSource.addEventListener('snapshot', (e) => {
  const { data } = JSON.parse(e.data)
  console.log('Initial snapshot:', data)
})

eventSource.addEventListener('data', (e) => {
  const { data } = JSON.parse(e.data)
  process.stdout.write(data)
})

eventSource.addEventListener('exit', (e) => {
  const { code } = JSON.parse(e.data)
  console.log('PTY exited with code:', code)
  eventSource.close()
})

// Write input
await fetch(`http://localhost:3000/session/my-session/pty/${ptyID}/input`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ data: 'echo hello\n' }),
})
```

### React + xterm.js

```tsx
import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'

export function PTYTerminal({ sessionID }: { sessionID: string }) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const [ptyID, setPtyID] = useState<string | null>(null)

  useEffect(() => {
    if (!terminalRef.current) return

    const term = new Terminal({ cols: 80, rows: 24 })
    term.open(terminalRef.current)

    // Create PTY
    fetch(`http://localhost:3000/session/${sessionID}/pty`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cmd: ['bash', '-l'],
        cols: term.cols,
        rows: term.rows,
      }),
    })
      .then((r) => r.json())
      .then(({ ptyID }) => {
        setPtyID(ptyID)

        // Stream output
        const es = new EventSource(
          `http://localhost:3000/session/${sessionID}/pty/${ptyID}/stream`
        )

        es.addEventListener('snapshot', (e) => {
          const { data } = JSON.parse(e.data)
          term.write(data)
        })

        es.addEventListener('data', (e) => {
          const { data } = JSON.parse(e.data)
          term.write(data)
        })

        // Handle input
        term.onData((data) => {
          fetch(`http://localhost:3000/session/${sessionID}/pty/${ptyID}/input`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data }),
          })
        })

        // Handle resize
        term.onResize(({ cols, rows }) => {
          fetch(`http://localhost:3000/session/${sessionID}/pty/${ptyID}/resize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cols, rows }),
          })
        })
      })

    return () => {
      if (ptyID) {
        fetch(`http://localhost:3000/session/${sessionID}/pty/${ptyID}`, {
          method: 'DELETE',
        })
      }
    }
  }, [sessionID])

  return <div ref={terminalRef} />
}
```

### Ink (Node.js TUI)

```tsx
import { Terminal } from '@xterm/headless'
import { useEffect, useState } from 'react'

export function useXtermSSE(sessionID: string) {
  const [term] = useState(
    () =>
      new Terminal({
        cols: process.stdout.columns ?? 80,
        rows: process.stdout.rows ?? 24,
      })
  )

  useEffect(() => {
    let ptyID: string

    // Create PTY
    fetch(`http://localhost:3000/session/${sessionID}/pty`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cmd: ['bash', '-l'],
        cols: term.cols,
        rows: term.rows,
      }),
    })
      .then((r) => r.json())
      .then(({ ptyID: id }) => {
        ptyID = id

        const es = new EventSource(
          `http://localhost:3000/session/${sessionID}/pty/${ptyID}/stream`
        )

        es.addEventListener('snapshot', (e: any) => {
          const snap = JSON.parse(e.data).data as string
          term.write(snap)
        })

        es.addEventListener('data', (e: any) => {
          const { data } = JSON.parse(e.data)
          term.write(data)
        })
      })

    return () => {
      if (ptyID) {
        fetch(`http://localhost:3000/session/${sessionID}/pty/${ptyID}`, {
          method: 'DELETE',
        })
      }
    }
  }, [sessionID])

  return term
}
```

## Configuration

### Environment Variables

- `PORT`: Server port (default: 3000)

### Idle Cleanup

The server automatically cleans up idle PTYs:

- Cleanup interval: 5 minutes
- Max idle time: 30 minutes

Adjust these in `src/index-bun.ts`:

```typescript
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
const MAX_IDLE_MS = 30 * 60 * 1000 // 30 minutes
```

## Development

```bash
# Type check
bun run type-check

# Run all tests
bun test

# Run E2E tests only
bun run test:e2e

# Run tests with coverage
bun run test:coverage

# Watch mode
bun run test:watch
```

See [TESTING.md](./TESTING.md) for comprehensive testing documentation.

## Deployment

### Docker

```dockerfile
FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

EXPOSE 3000

CMD ["bun", "run", "start"]
```

### Systemd

```ini
[Unit]
Description=OpenComposer Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/opencomposer
ExecStart=/usr/local/bin/bun run /opt/opencomposer/src/index-bun.ts
Restart=always

[Install]
WantedBy=multi-user.target
```

## Security Considerations

- **Authentication**: Add authentication middleware before deploying
- **Rate limiting**: Implement rate limiting per session
- **Resource limits**: Set memory and CPU limits per PTY
- **Input validation**: All inputs are validated, but review for your use case
- **CORS**: Configure CORS origins in production (currently set to `*`)

## References

- [OpenCode Server Docs](https://opencode.ai/docs/server/)
- [Hono](https://hono.dev) - Fast web framework
- [Bun](https://bun.sh) - All-in-one JavaScript runtime
- [Bun Subprocess](https://bun.sh/docs/api/spawn) - Process spawning API
- [xterm.js headless](https://github.com/xtermjs/xterm.js) - Terminal emulator
- [xterm serialization addon](https://github.com/xtermjs/xterm.js/tree/master/addons/xterm-addon-serialize) - Snapshot support
- [Server-Sent Events (SSE)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) - Real-time streaming

## License

MIT

## Author

Shun Kakinoki
