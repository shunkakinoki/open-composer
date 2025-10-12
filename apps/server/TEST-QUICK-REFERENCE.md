# Testing Quick Reference

## Run Tests

```bash
# All tests
bun test

# E2E only
bun run test:e2e

# Specific file
bun test src/tests/pty-lifecycle.test.ts

# Watch mode
bun run test:watch

# With coverage
bun run test:coverage
```

## Test Structure

```
tests/
├── helpers.ts              # Shared utilities
├── api-health.test.ts      # API & health checks (9 tests)
├── pty-lifecycle.test.ts   # Create, list, delete (10 tests)
├── pty-streaming.test.ts   # SSE streaming (7 tests)
├── pty-io.test.ts          # Input/output (9 tests)
├── pty-snapshot.test.ts    # Snapshots & resize (11 tests)
├── pty-persistence.test.ts # Recovery & persistence (18 tests)
└── pty-advanced.test.ts    # Advanced scenarios (16 tests)
```

## Writing Tests

### Basic Template

```typescript
import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import type { Server } from 'bun'
import { createTestServer, randomSessionID } from './helpers.js'

describe('My Tests', () => {
  let server: Server<unknown>
  let baseURL: string

  beforeAll(async () => {
    server = await createTestServer()
    baseURL = `http://localhost:${server.port}`
  })

  afterAll(() => {
    server.stop()
  })

  test('should do something', async () => {
    const sessionID = randomSessionID()
    // Test code
  })
})
```

## Helper Functions

```typescript
// Server
const server = await createTestServer()

// PTY operations
const ptyID = await createPTY(baseURL, sessionID, ['bash', '-l'])
await writeInput(baseURL, sessionID, ptyID, 'echo test\n')
const snapshot = await getSnapshot(baseURL, sessionID, ptyID)
await killPTY(baseURL, sessionID, ptyID)

// SSE
const sseReader = await connectSSE(url)
const event = await sseReader.readEvent(5000)
const events = await sseReader.readEvents(3, 5000)
await sseReader.close()

// Utilities
const sessionID = randomSessionID()
await waitFor(() => condition, 5000)
```

## Common Patterns

### Create and Clean Up

```typescript
test('example', async () => {
  const sessionID = randomSessionID()
  const ptyID = await createPTY(baseURL, sessionID)

  try {
    // Your test code
    expect(ptyID).toBeTruthy()
  } finally {
    await killPTY(baseURL, sessionID, ptyID)
  }
})
```

### SSE Testing

```typescript
test('sse example', async () => {
  const ptyID = await createPTY(baseURL, sessionID)
  const sseReader = await connectSSE(
    `${baseURL}/session/${sessionID}/pty/${ptyID}/stream`
  )

  try {
    const snapshot = await sseReader.readEvent()
    expect(snapshot!.event).toBe('snapshot')
  } finally {
    await sseReader.close()
    await killPTY(baseURL, sessionID, ptyID)
  }
})
```

### With Timeout

```typescript
test('long running test', async () => {
  // Test code
}, 10000) // 10 second timeout
```

## Debugging

```bash
# Verbose output
bun test --verbose

# Specific test pattern
bun test --test-name-pattern "should create"

# With debugger
bun --inspect test
```

## Coverage

```bash
# Generate coverage
bun run test:coverage

# View coverage/index.html
open coverage/index.html
```

## CI/CD

See `.github-workflows-example.yml` for GitHub Actions configuration.

## Test Counts

- **API Health**: 9 tests
- **PTY Lifecycle**: 10 tests
- **PTY Streaming**: 7 tests
- **PTY I/O**: 9 tests
- **PTY Snapshot**: 11 tests
- **PTY Persistence**: 18 tests (NEW!)
- **PTY Advanced**: 16 tests (NEW!)
- **Total**: 80 E2E tests

### Persistence Tests Cover

✅ Snapshot recovery
✅ Client reconnection
✅ Session resumption
✅ Working directory preservation
✅ Environment variable persistence
✅ Long-running process recovery
✅ Rapid connect/disconnect cycles
✅ Concurrent client management

## More Info

See [TESTING.md](./TESTING.md) for comprehensive documentation.
