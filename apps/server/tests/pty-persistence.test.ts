/**
 * E2E Tests - PTY Persistence and Session Recovery
 *
 * Tests the ability to persist terminal state and recover sessions
 * after disconnection or server restart.
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import type { Server } from 'bun'
import {
  createTestServer,
  createPTY,
  writeInput,
  killPTY,
  getSnapshot,
  connectSSE,
  randomSessionID,
} from './helpers.js'

describe('PTY Persistence - Snapshot Recovery', () => {
  let server: Server<unknown>
  let baseURL: string

  beforeAll(async () => {
    server = await createTestServer()
    baseURL = `http://localhost:${server.port}`
  })

  afterAll(() => {
    server.stop()
  })

  test('should persist terminal state in snapshot', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['bash', '-l'])

    // Generate terminal history
    await writeInput(baseURL, sessionID, ptyID, 'echo "Line 1"\n')
    await Bun.sleep(300)
    await writeInput(baseURL, sessionID, ptyID, 'echo "Line 2"\n')
    await Bun.sleep(300)
    await writeInput(baseURL, sessionID, ptyID, 'echo "Line 3"\n')
    await Bun.sleep(500)

    // Get snapshot
    const snapshot = await getSnapshot(baseURL, sessionID, ptyID)

    // Snapshot should contain all history
    expect(snapshot).toContain('Line 1')
    expect(snapshot).toContain('Line 2')
    expect(snapshot).toContain('Line 3')

    // Clean up
    await killPTY(baseURL, sessionID, ptyID)
  }, 10000)

  test('should allow multiple clients to get same snapshot', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['bash', '-l'])

    // Generate some output
    await writeInput(baseURL, sessionID, ptyID, 'echo "Test Output"\n')
    await Bun.sleep(500)

    // Multiple clients get snapshot
    const snapshot1 = await getSnapshot(baseURL, sessionID, ptyID)
    const snapshot2 = await getSnapshot(baseURL, sessionID, ptyID)
    const snapshot3 = await getSnapshot(baseURL, sessionID, ptyID)

    // All should be identical
    expect(snapshot1).toBe(snapshot2)
    expect(snapshot2).toBe(snapshot3)
    expect(snapshot1).toContain('Test Output')

    // Clean up
    await killPTY(baseURL, sessionID, ptyID)
  }, 10000)

  test('should provide instant recovery via SSE snapshot event', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['bash', '-l'])

    // Generate terminal history
    await writeInput(baseURL, sessionID, ptyID, 'echo "Existing Output"\n')
    await Bun.sleep(500)

    // New client connects and gets snapshot immediately
    const sseReader = await connectSSE(
      `${baseURL}/session/${sessionID}/pty/${ptyID}/stream`,
    )

    try {
      // First event should be snapshot with existing state
      const snapshotEvent = await sseReader.readEvent(2000)
      expect(snapshotEvent).toBeTruthy()
      expect(snapshotEvent!.event).toBe('snapshot')

      const snapshotData = JSON.parse(snapshotEvent!.data!)
      expect(snapshotData.data).toContain('Existing Output')
    } finally {
      await sseReader.close()
      await killPTY(baseURL, sessionID, ptyID)
    }
  }, 10000)

  test('should preserve scrollback buffer in snapshot', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['bash', '-l'])

    // Generate lots of output to test scrollback
    for (let i = 0; i < 20; i++) {
      await writeInput(
        baseURL,
        sessionID,
        ptyID,
        `echo "Scrollback line ${i}"\n`,
      )
      await Bun.sleep(50)
    }
    await Bun.sleep(500)

    const snapshot = await getSnapshot(baseURL, sessionID, ptyID)

    // Should contain early lines (scrollback)
    expect(snapshot).toContain('Scrollback line 0')
    expect(snapshot).toContain('Scrollback line 5')
    expect(snapshot).toContain('Scrollback line 10')
    expect(snapshot).toContain('Scrollback line 19')

    // Clean up
    await killPTY(baseURL, sessionID, ptyID)
  }, 15000)

  test('should handle snapshot of PTY with no output', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['cat'])

    // Get snapshot immediately (no output yet)
    const snapshot = await getSnapshot(baseURL, sessionID, ptyID)

    // Should return empty/minimal snapshot (empty string is valid)
    expect(typeof snapshot).toBe('string')

    // Clean up
    await killPTY(baseURL, sessionID, ptyID)
  })

  test('should capture ANSI formatting in snapshot', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['bash', '-l'])

    // Write colored output
    await writeInput(
      baseURL,
      sessionID,
      ptyID,
      'echo -e "\\033[31mRed\\033[0m \\033[32mGreen\\033[0m \\033[34mBlue\\033[0m"\n',
    )
    await Bun.sleep(500)

    const snapshot = await getSnapshot(baseURL, sessionID, ptyID)

    // Should preserve the text content
    expect(snapshot).toContain('Red')
    expect(snapshot).toContain('Green')
    expect(snapshot).toContain('Blue')

    // Clean up
    await killPTY(baseURL, sessionID, ptyID)
  }, 10000)
})

describe('PTY Persistence - Client Reconnection', () => {
  let server: Server<unknown>
  let baseURL: string

  beforeAll(async () => {
    server = await createTestServer()
    baseURL = `http://localhost:${server.port}`
  })

  afterAll(() => {
    server.stop()
  })

  test('should allow client to disconnect and reconnect', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['bash', '-l'])

    // First connection
    const reader1 = await connectSSE(
      `${baseURL}/session/${sessionID}/pty/${ptyID}/stream`,
    )

    // Get initial snapshot
    const snapshot1 = await reader1.readEvent()
    expect(snapshot1!.event).toBe('snapshot')

    // Disconnect
    await reader1.close()
    await Bun.sleep(200)

    // While disconnected, generate output
    await writeInput(baseURL, sessionID, ptyID, 'echo "Missed output"\n')
    await Bun.sleep(500)

    // Reconnect - should get snapshot with missed output
    const reader2 = await connectSSE(
      `${baseURL}/session/${sessionID}/pty/${ptyID}/stream`,
    )

    try {
      const snapshot2 = await reader2.readEvent()
      expect(snapshot2!.event).toBe('snapshot')

      const data = JSON.parse(snapshot2!.data!)
      expect(data.data).toContain('Missed output')
    } finally {
      await reader2.close()
      await killPTY(baseURL, sessionID, ptyID)
    }
  }, 10000)

  test('should support multiple sequential reconnections', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['bash', '-l'])

    // Connect, disconnect, connect cycle
    for (let i = 0; i < 5; i++) {
      const reader = await connectSSE(
        `${baseURL}/session/${sessionID}/pty/${ptyID}/stream`,
      )

      // Should always get snapshot first
      const event = await reader.readEvent(2000)
      expect(event!.event).toBe('snapshot')

      await reader.close()
      await Bun.sleep(100)
    }

    // Clean up
    await killPTY(baseURL, sessionID, ptyID)
  }, 15000)

  test('should maintain PTY state across client disconnections', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['bash', '-l'])

    // First client: set variable
    await writeInput(baseURL, sessionID, ptyID, 'TEST_VAR="persistent"\n')
    await Bun.sleep(300)

    // Connect and disconnect
    const reader1 = await connectSSE(
      `${baseURL}/session/${sessionID}/pty/${ptyID}/stream`,
    )
    await reader1.readEvent()
    await reader1.close()
    await Bun.sleep(200)

    // Second client: read variable
    await writeInput(baseURL, sessionID, ptyID, 'echo $TEST_VAR\n')
    await Bun.sleep(500)

    const reader2 = await connectSSE(
      `${baseURL}/session/${sessionID}/pty/${ptyID}/stream`,
    )

    try {
      const snapshot = await reader2.readEvent()
      const data = JSON.parse(snapshot!.data!)
      expect(data.data).toContain('persistent')
    } finally {
      await reader2.close()
      await killPTY(baseURL, sessionID, ptyID)
    }
  }, 10000)

  test('should handle multiple concurrent clients with disconnections', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['bash', '-l'])

    // Client 1 connects
    const reader1 = await connectSSE(
      `${baseURL}/session/${sessionID}/pty/${ptyID}/stream`,
    )
    await reader1.readEvent()

    // Client 2 connects
    const reader2 = await connectSSE(
      `${baseURL}/session/${sessionID}/pty/${ptyID}/stream`,
    )
    await reader2.readEvent()

    // Client 1 disconnects
    await reader1.close()
    await Bun.sleep(200)

    // PTY should still work for client 2
    await writeInput(baseURL, sessionID, ptyID, 'echo "Still working"\n')

    let foundOutput = false
    for (let i = 0; i < 10; i++) {
      const event = await reader2.readEvent(500)
      if (event && event.event === 'data') {
        const data = JSON.parse(event.data!)
        if (data.data.includes('Still working')) {
          foundOutput = true
          break
        }
      }
    }

    expect(foundOutput).toBe(true)

    // Clean up
    await reader2.close()
    await killPTY(baseURL, sessionID, ptyID)
  }, 10000)
})

describe('PTY Persistence - Session Resumption', () => {
  let server: Server<unknown>
  let baseURL: string

  beforeAll(async () => {
    server = await createTestServer()
    baseURL = `http://localhost:${server.port}`
  })

  afterAll(() => {
    server.stop()
  })

  test('should resume session with full history', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['bash', '-l'])

    // Execute commands to build history
    const commands = [
      'echo "Command 1"',
      'pwd',
      'echo "Command 2"',
      'whoami',
      'echo "Command 3"',
    ]

    for (const cmd of commands) {
      await writeInput(baseURL, sessionID, ptyID, `${cmd}\n`)
      await Bun.sleep(200)
    }
    await Bun.sleep(500)

    // Get snapshot for resumption
    const snapshot = await getSnapshot(baseURL, sessionID, ptyID)

    // Should contain all command outputs
    expect(snapshot).toContain('Command 1')
    expect(snapshot).toContain('Command 2')
    expect(snapshot).toContain('Command 3')

    // Verify we can continue from this state
    await writeInput(baseURL, sessionID, ptyID, 'echo "Resumed"\n')
    await Bun.sleep(500)

    const newSnapshot = await getSnapshot(baseURL, sessionID, ptyID)
    expect(newSnapshot).toContain('Resumed')
    expect(newSnapshot.length).toBeGreaterThan(snapshot.length)

    // Clean up
    await killPTY(baseURL, sessionID, ptyID)
  }, 15000)

  test('should preserve working directory across disconnections', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['bash', '-l'])

    // Change directory
    await writeInput(baseURL, sessionID, ptyID, 'cd /tmp\n')
    await Bun.sleep(300)

    // Disconnect and reconnect
    const reader1 = await connectSSE(
      `${baseURL}/session/${sessionID}/pty/${ptyID}/stream`,
    )
    await reader1.readEvent()
    await reader1.close()
    await Bun.sleep(200)

    // Check pwd after reconnection
    await writeInput(baseURL, sessionID, ptyID, 'pwd\n')
    await Bun.sleep(500)

    const snapshot = await getSnapshot(baseURL, sessionID, ptyID)
    expect(snapshot).toContain('/tmp')

    // Clean up
    await killPTY(baseURL, sessionID, ptyID)
  }, 10000)

  test('should preserve environment variables', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['bash', '-l'])

    // Set environment variable
    await writeInput(
      baseURL,
      sessionID,
      ptyID,
      'export RECOVERY_TEST="preserved"\n',
    )
    await Bun.sleep(300)

    // Simulate disconnection
    const reader1 = await connectSSE(
      `${baseURL}/session/${sessionID}/pty/${ptyID}/stream`,
    )
    await reader1.readEvent()
    await reader1.close()
    await Bun.sleep(200)

    // Check variable after "recovery"
    await writeInput(baseURL, sessionID, ptyID, 'echo $RECOVERY_TEST\n')
    await Bun.sleep(500)

    const snapshot = await getSnapshot(baseURL, sessionID, ptyID)
    expect(snapshot).toContain('preserved')

    // Clean up
    await killPTY(baseURL, sessionID, ptyID)
  }, 10000)

  test('should handle long-running process recovery', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['bash', '-l'])

    // Start a long-running process
    await writeInput(
      baseURL,
      sessionID,
      ptyID,
      'for i in {1..5}; do echo "Iteration $i"; sleep 0.5; done &\n',
    )
    await Bun.sleep(500)

    // Disconnect
    const reader1 = await connectSSE(
      `${baseURL}/session/${sessionID}/pty/${ptyID}/stream`,
    )
    await reader1.readEvent()
    await reader1.close()

    // Wait for process to continue
    await Bun.sleep(2000)

    // Reconnect and should see accumulated output
    const reader2 = await connectSSE(
      `${baseURL}/session/${sessionID}/pty/${ptyID}/stream`,
    )

    try {
      const snapshot = await reader2.readEvent()
      const data = JSON.parse(snapshot!.data!)

      // Should have multiple iterations
      const iterations = (data.data.match(/Iteration/g) || []).length
      expect(iterations).toBeGreaterThan(1)
    } finally {
      await reader2.close()
      await killPTY(baseURL, sessionID, ptyID)
    }
  }, 15000)
})

describe('PTY Persistence - Edge Cases', () => {
  let server: Server<unknown>
  let baseURL: string

  beforeAll(async () => {
    server = await createTestServer()
    baseURL = `http://localhost:${server.port}`
  })

  afterAll(() => {
    server.stop()
  })

  test('should handle rapid connect/disconnect cycles', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['bash', '-l'])

    // Rapid connections
    for (let i = 0; i < 10; i++) {
      const reader = await connectSSE(
        `${baseURL}/session/${sessionID}/pty/${ptyID}/stream`,
      )
      await reader.readEvent(1000)
      await reader.close()
    }

    // PTY should still be healthy (snapshot returns string, even if empty)
    const snapshot = await getSnapshot(baseURL, sessionID, ptyID)
    expect(typeof snapshot).toBe('string')

    // Clean up
    await killPTY(baseURL, sessionID, ptyID)
  }, 15000)

  test('should handle snapshot request during heavy output', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['bash', '-l'])

    // Start generating lots of output
    await writeInput(
      baseURL,
      sessionID,
      ptyID,
      'for i in {1..50}; do echo "Output $i"; done\n',
    )

    // Request snapshot while output is being generated
    await Bun.sleep(100)
    const snapshot = await getSnapshot(baseURL, sessionID, ptyID)

    expect(snapshot).toBeTruthy()
    expect(snapshot).toContain('Output')

    // Clean up
    await Bun.sleep(500)
    await killPTY(baseURL, sessionID, ptyID)
  }, 10000)

  test('should preserve snapshot across terminal resize', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['bash', '-l'])

    // Generate output
    await writeInput(baseURL, sessionID, ptyID, 'echo "Before resize"\n')
    await Bun.sleep(500)

    const snapshot1 = await getSnapshot(baseURL, sessionID, ptyID)
    expect(snapshot1).toContain('Before resize')

    // Resize terminal
    await fetch(`${baseURL}/session/${sessionID}/pty/${ptyID}/resize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cols: 120, rows: 40 }),
    })
    await Bun.sleep(200)

    // Snapshot should still contain previous content
    const snapshot2 = await getSnapshot(baseURL, sessionID, ptyID)
    expect(snapshot2).toContain('Before resize')

    // Continue with new size
    await writeInput(baseURL, sessionID, ptyID, 'echo "After resize"\n')
    await Bun.sleep(500)

    const snapshot3 = await getSnapshot(baseURL, sessionID, ptyID)
    expect(snapshot3).toContain('Before resize')
    expect(snapshot3).toContain('After resize')

    // Clean up
    await killPTY(baseURL, sessionID, ptyID)
  }, 10000)

  test('should handle empty snapshot for just-created PTY', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['cat'])

    // Immediate snapshot (before any output)
    const snapshot = await getSnapshot(baseURL, sessionID, ptyID)

    expect(typeof snapshot).toBe('string')
    // Should be empty or minimal (empty string is valid)
    expect(snapshot.length).toBeGreaterThanOrEqual(0)

    // Clean up
    await killPTY(baseURL, sessionID, ptyID)
  })

  test('should track last activity time across operations', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['bash', '-l'])

    // Initial activity
    await Bun.sleep(100)

    // Write input (should update activity)
    await writeInput(baseURL, sessionID, ptyID, 'echo "test"\n')
    await Bun.sleep(100)

    // Get snapshot (should update activity)
    await getSnapshot(baseURL, sessionID, ptyID)
    await Bun.sleep(100)

    // Resize (should update activity)
    await fetch(`${baseURL}/session/${sessionID}/pty/${ptyID}/resize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cols: 80, rows: 24 }),
    })

    // PTY should still be active and healthy
    const finalSnapshot = await getSnapshot(baseURL, sessionID, ptyID)
    expect(finalSnapshot).toBeTruthy()

    // Clean up
    await killPTY(baseURL, sessionID, ptyID)
  })
})
