# Testing Guide

Comprehensive E2E testing for OpenComposer Server using Bun's built-in test runner.

## Quick Start

```bash
# Run all tests
bun test

# Run E2E tests only
bun run test:e2e

# Run tests in watch mode
bun run test:watch

# Run tests with coverage
bun run test:coverage
```

## Test Structure

```
tests/
├── helpers.ts              # Shared utilities and test helpers
├── api-health.test.ts      # API health and basic endpoints (9 tests)
├── pty-lifecycle.test.ts   # PTY creation, listing, deletion (10 tests)
├── pty-streaming.test.ts   # SSE streaming functionality (7 tests)
├── pty-io.test.ts          # Input/output operations (9 tests)
├── pty-snapshot.test.ts    # Snapshots and resize operations (11 tests)
├── pty-persistence.test.ts # Session recovery and persistence (18 tests)
└── pty-advanced.test.ts    # Advanced scenarios and stress tests (16 tests)
```

**Total: 80 E2E tests** covering all aspects of the PTY server.

## Test Suites

### 1. API Health Tests (`api-health.test.ts`)

Tests basic server functionality and endpoints.

**Coverage:**
- Root endpoint (GET /)
- Health check (GET /health)
- 404 handling
- CORS support
- Concurrent requests
- Uptime tracking
- Error handling
- API documentation

**Example:**
```typescript
test('should respond to health endpoint', async () => {
  const response = await fetch(`${baseURL}/health`)
  expect(response.ok).toBe(true)

  const data = await response.json()
  expect(data.status).toBe('ok')
})
```

### 2. PTY Lifecycle Tests (`pty-lifecycle.test.ts`)

Tests PTY creation, management, and deletion.

**Coverage:**
- Create PTY with default shell
- Create PTY with custom command
- List PTYs for a session
- Kill specific PTY
- Kill all PTYs for a session
- 404 for non-existent PTY
- Request validation
- Session isolation
- Custom cwd and env

**Example:**
```typescript
test('should create a PTY session', async () => {
  const sessionID = randomSessionID()
  const ptyID = await createPTY(baseURL, sessionID)

  expect(ptyID).toBeTruthy()
  expect(typeof ptyID).toBe('string')

  await killPTY(baseURL, sessionID, ptyID)
})
```

### 3. PTY Streaming Tests (`pty-streaming.test.ts`)

Tests SSE (Server-Sent Events) streaming functionality.

**Coverage:**
- Stream PTY output via SSE
- Receive snapshot event
- Receive data events
- Receive exit event
- Multiple SSE clients
- 404 for non-existent stream
- Connection close handling
- Long-running process streaming

**Example:**
```typescript
test('should stream PTY output via SSE', async () => {
  const sseReader = await connectSSE(
    `${baseURL}/session/${sessionID}/pty/${ptyID}/stream`
  )

  const snapshotEvent = await sseReader.readEvent()
  expect(snapshotEvent!.event).toBe('snapshot')

  await sseReader.close()
})
```

### 4. PTY I/O Tests (`pty-io.test.ts`)

Tests input/output operations.

**Coverage:**
- Write input to PTY
- Multiple input writes
- Special characters handling
- SSE output after input
- Request validation
- 404 for non-existent PTY
- Large input handling
- Rapid input writes
- Exit command handling

**Example:**
```typescript
test('should write input to PTY', async () => {
  await writeInput(baseURL, sessionID, ptyID, 'echo test\n')
  await Bun.sleep(500)

  const snapshot = await getSnapshot(baseURL, sessionID, ptyID)
  expect(snapshot).toContain('test')
})
```

### 5. PTY Snapshot Tests (`pty-snapshot.test.ts`)

Tests snapshot serialization and terminal resize.

**Coverage:**
- Get empty snapshot
- Capture output in snapshot
- Progressive snapshot growth
- 404 for non-existent PTY
- Large scrollback handling
- ANSI escape codes preservation
- Concurrent snapshot requests
- Terminal buffer resize
- Resize validation
- Multiple resize operations

**Example:**
```typescript
test('should capture output in snapshot', async () => {
  await writeInput(baseURL, sessionID, ptyID, 'echo "Test"\n')
  await Bun.sleep(500)

  const snapshot = await getSnapshot(baseURL, sessionID, ptyID)
  expect(snapshot).toContain('Test')
})
```

### 6. PTY Persistence Tests (`pty-persistence.test.ts`)

Tests session recovery and persistent terminal state.

**Coverage:**
- **Snapshot Recovery**
  - Persist terminal state in snapshot
  - Multiple clients getting same snapshot
  - Instant recovery via SSE snapshot event
  - Scrollback buffer preservation
  - ANSI formatting preservation

- **Client Reconnection**
  - Disconnect and reconnect with state recovery
  - Multiple sequential reconnections
  - PTY state across disconnections
  - Multiple concurrent clients with disconnections

- **Session Resumption**
  - Resume session with full history
  - Working directory preservation
  - Environment variables preservation
  - Long-running process recovery

- **Edge Cases**
  - Rapid connect/disconnect cycles
  - Snapshot during heavy output
  - Snapshot across terminal resize
  - Empty snapshot handling
  - Last activity tracking

**Example:**
```typescript
test('should allow client to disconnect and reconnect', async () => {
  const ptyID = await createPTY(baseURL, sessionID)

  // First connection
  const reader1 = await connectSSE(...)
  await reader1.readEvent()
  await reader1.close()

  // Generate output while disconnected
  await writeInput(baseURL, sessionID, ptyID, 'echo "Missed"\n')
  await Bun.sleep(500)

  // Reconnect - should get snapshot with missed output
  const reader2 = await connectSSE(...)
  const snapshot = await reader2.readEvent()
  const data = JSON.parse(snapshot!.data!)
  expect(data.data).toContain('Missed')
})
```

### 7. PTY Advanced Tests (`pty-advanced.test.ts`)

Tests complex scenarios, concurrent operations, and stress testing.

**Coverage:**
- **Session Management**
  - PTY isolation across sessions
  - Multiple PTYs in same session
  - Session listing
  - Bulk session cleanup

- **Concurrent Operations**
  - Concurrent PTY creation
  - Concurrent writes to same PTY
  - Concurrent snapshot requests
  - Concurrent SSE connections

- **Stress Testing**
  - Rapid create/destroy cycles
  - Large input strings
  - Many rapid writes
  - Very long output handling

- **Error Recovery**
  - Writes to exited PTY
  - Snapshot after PTY exit
  - SSE connection to exited PTY

**Example:**
```typescript
test('should handle concurrent PTY creation', async () => {
  const promises = Array.from({ length: 5 }, () =>
    createPTY(baseURL, sessionID)
  )

  const ptyIDs = await Promise.all(promises)

  expect(ptyIDs.length).toBe(5)
  expect(new Set(ptyIDs).size).toBe(5) // All unique
})
```

## Test Helpers

The `helpers.ts` file provides utilities for testing:

### Server Management

```typescript
// Create a test server on a random port
const server = await createTestServer()
const baseURL = `http://localhost:${server.port}`
```

### PTY Operations

```typescript
// Create PTY
const ptyID = await createPTY(baseURL, sessionID, ['bash', '-l'])

// Write input
await writeInput(baseURL, sessionID, ptyID, 'echo test\n')

// Get snapshot
const snapshot = await getSnapshot(baseURL, sessionID, ptyID)

// Kill PTY
await killPTY(baseURL, sessionID, ptyID)

// Generate random session ID
const sessionID = randomSessionID()
```

### SSE Streaming

```typescript
// Connect to SSE stream
const sseReader = await connectSSE(url)

// Read single event
const event = await sseReader.readEvent(timeout)

// Read multiple events
const events = await sseReader.readEvents(count, timeout)

// Close connection
await sseReader.close()
```

### Utilities

```typescript
// Wait for condition
await waitFor(() => someCondition(), 5000)
```

## Writing New Tests

### Basic Test Structure

```typescript
import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import type { Server } from 'bun'
import { createTestServer, randomSessionID } from './helpers.js'

describe('My Test Suite', () => {
  let server: Server
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
    // Test implementation
  })
})
```

### Best Practices

1. **Clean up resources**: Always kill PTYs after tests
2. **Use random session IDs**: Avoid test interference
3. **Set timeouts**: Long-running tests need explicit timeouts
4. **Handle async properly**: Use await for all async operations
5. **Test error cases**: Include validation and 404 tests
6. **Isolate tests**: Each test should be independent

### Example with Cleanup

```typescript
test('should create and clean up PTY', async () => {
  const sessionID = randomSessionID()
  const ptyID = await createPTY(baseURL, sessionID)

  try {
    // Test operations
    expect(ptyID).toBeTruthy()
  } finally {
    // Always clean up
    await killPTY(baseURL, sessionID, ptyID)
  }
})
```

## Running Specific Tests

```bash
# Run specific test file
bun test src/tests/pty-lifecycle.test.ts

# Run tests matching pattern
bun test --test-name-pattern "should create"

# Run with verbose output
bun test --verbose

# Run in CI mode
bun test --ci
```

## Coverage Reports

```bash
# Generate coverage report
bun run test:coverage

# Coverage is saved to ./coverage/
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Type check
        run: bun run type-check

      - name: Run tests
        run: bun test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

## Debugging Tests

### Enable Verbose Logging

```typescript
test('debug test', async () => {
  console.log('Test started')
  const result = await someOperation()
  console.log('Result:', result)
})
```

### Use Bun's Debugger

```bash
# Run tests with inspector
bun --inspect test

# Run specific test with debugger
bun --inspect test src/tests/pty-lifecycle.test.ts
```

### SSE Debugging

```typescript
test('debug SSE', async () => {
  const sseReader = await connectSSE(url)

  for (let i = 0; i < 10; i++) {
    const event = await sseReader.readEvent()
    console.log('Event:', event)
  }

  await sseReader.close()
})
```

## Performance Testing

### Concurrent Operations

```typescript
test('should handle concurrent PTY creation', async () => {
  const sessionID = randomSessionID()
  const count = 10

  const start = Date.now()
  const promises = Array.from({ length: count }, () =>
    createPTY(baseURL, sessionID)
  )
  const ptyIDs = await Promise.all(promises)
  const duration = Date.now() - start

  expect(ptyIDs.length).toBe(count)
  console.log(`Created ${count} PTYs in ${duration}ms`)

  // Clean up
  await Promise.all(
    ptyIDs.map(id => killPTY(baseURL, sessionID, id))
  )
})
```

### Load Testing

For heavy load testing, use dedicated tools like:
- [k6](https://k6.io/)
- [autocannon](https://github.com/mcollina/autocannon)
- [wrk](https://github.com/wg/wrk)

Example k6 script:

```javascript
import http from 'k6/http'
import { check } from 'k6'

export const options = {
  vus: 10,
  duration: '30s',
}

export default function () {
  const res = http.get('http://localhost:3000/health')
  check(res, {
    'status is 200': (r) => r.status === 200,
  })
}
```

## Troubleshooting

### Tests Hanging

- Check for unclosed resources (PTYs, SSE streams)
- Ensure all async operations have timeouts
- Look for infinite loops in test logic

### Flaky Tests

- Add retries for timing-dependent operations
- Increase timeouts for slow operations
- Use `waitFor()` instead of fixed sleeps
- Ensure proper cleanup between tests

### Port Conflicts

- Tests use random ports by default
- If issues persist, check for lingering processes:
  ```bash
  lsof -i :3000
  ```

## Additional Resources

- [Bun Test Runner Docs](https://bun.sh/docs/cli/test)
- [OpenComposer Server README](./README.md)
- [API Documentation](./README.md#api-reference)
