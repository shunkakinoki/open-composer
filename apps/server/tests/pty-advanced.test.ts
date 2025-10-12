/**
 * E2E Tests - Advanced PTY Scenarios
 *
 * Tests complex scenarios including session management,
 * concurrent operations, and stress testing.
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

describe('PTY Advanced - Session Management', () => {
  let server: Server<unknown>
  let baseURL: string

  beforeAll(async () => {
    server = await createTestServer()
    baseURL = `http://localhost:${server.port}`
  })

  afterAll(() => {
    server.stop()
  })

  test('should isolate PTYs across different sessions', async () => {
    const session1 = randomSessionID()
    const session2 = randomSessionID()

    // Create PTYs in different sessions
    const pty1 = await createPTY(baseURL, session1, ['bash', '-l'])
    const pty2 = await createPTY(baseURL, session2, ['bash', '-l'])

    // Write different content to each
    await writeInput(baseURL, session1, pty1, 'echo "Session 1"\n')
    await writeInput(baseURL, session2, pty2, 'echo "Session 2"\n')
    await Bun.sleep(500)

    // Verify isolation
    const snapshot1 = await getSnapshot(baseURL, session1, pty1)
    const snapshot2 = await getSnapshot(baseURL, session2, pty2)

    expect(snapshot1).toContain('Session 1')
    expect(snapshot1).not.toContain('Session 2')
    expect(snapshot2).toContain('Session 2')
    expect(snapshot2).not.toContain('Session 1')

    // Clean up
    await killPTY(baseURL, session1, pty1)
    await killPTY(baseURL, session2, pty2)
  }, 10000)

  test('should handle multiple PTYs in same session', async () => {
    const sessionID = randomSessionID()

    // Create multiple PTYs
    const pty1 = await createPTY(baseURL, sessionID, ['bash', '-l'])
    const pty2 = await createPTY(baseURL, sessionID, ['bash', '-l'])
    const pty3 = await createPTY(baseURL, sessionID, ['bash', '-l'])

    // Each should be independent
    await writeInput(baseURL, sessionID, pty1, 'echo "PTY 1"\n')
    await writeInput(baseURL, sessionID, pty2, 'echo "PTY 2"\n')
    await writeInput(baseURL, sessionID, pty3, 'echo "PTY 3"\n')
    await Bun.sleep(500)

    const snap1 = await getSnapshot(baseURL, sessionID, pty1)
    const snap2 = await getSnapshot(baseURL, sessionID, pty2)
    const snap3 = await getSnapshot(baseURL, sessionID, pty3)

    expect(snap1).toContain('PTY 1')
    expect(snap2).toContain('PTY 2')
    expect(snap3).toContain('PTY 3')

    // Clean up
    await fetch(`${baseURL}/session/${sessionID}/pty`, { method: 'DELETE' })
  }, 10000)

  test('should list PTYs correctly per session', async () => {
    const session1 = randomSessionID()
    const session2 = randomSessionID()

    // Create PTYs in both sessions
    const s1p1 = await createPTY(baseURL, session1)
    const s1p2 = await createPTY(baseURL, session1)
    const s2p1 = await createPTY(baseURL, session2)

    // List session 1
    const list1 = await fetch(`${baseURL}/session/${session1}/pty`)
    const { ptys: ptys1 } = await list1.json()
    expect(ptys1).toContain(s1p1)
    expect(ptys1).toContain(s1p2)
    expect(ptys1).not.toContain(s2p1)
    expect(ptys1.length).toBe(2)

    // List session 2
    const list2 = await fetch(`${baseURL}/session/${session2}/pty`)
    const { ptys: ptys2 } = await list2.json()
    expect(ptys2).toContain(s2p1)
    expect(ptys2).not.toContain(s1p1)
    expect(ptys2).not.toContain(s1p2)
    expect(ptys2.length).toBe(1)

    // Clean up
    await fetch(`${baseURL}/session/${session1}/pty`, { method: 'DELETE' })
    await fetch(`${baseURL}/session/${session2}/pty`, { method: 'DELETE' })
  })

  test('should clean up all PTYs when session is deleted', async () => {
    const sessionID = randomSessionID()

    // Create multiple PTYs
    await createPTY(baseURL, sessionID)
    await createPTY(baseURL, sessionID)
    await createPTY(baseURL, sessionID)

    // Verify they exist
    const listBefore = await fetch(`${baseURL}/session/${sessionID}/pty`)
    const { ptys: ptysBefore } = await listBefore.json()
    expect(ptysBefore.length).toBe(3)

    // Delete all
    await fetch(`${baseURL}/session/${sessionID}/pty`, { method: 'DELETE' })

    // Verify all gone
    const listAfter = await fetch(`${baseURL}/session/${sessionID}/pty`)
    const { ptys: ptysAfter } = await listAfter.json()
    expect(ptysAfter.length).toBe(0)
  })
})

describe('PTY Advanced - Concurrent Operations', () => {
  let server: Server<unknown>
  let baseURL: string

  beforeAll(async () => {
    server = await createTestServer()
    baseURL = `http://localhost:${server.port}`
  })

  afterAll(() => {
    server.stop()
  })

  test('should handle concurrent PTY creation', async () => {
    const sessionID = randomSessionID()

    // Create multiple PTYs concurrently
    const promises = Array.from({ length: 5 }, () =>
      createPTY(baseURL, sessionID),
    )

    const ptyIDs = await Promise.all(promises)

    // All should succeed
    expect(ptyIDs.length).toBe(5)
    ptyIDs.forEach((id) => {
      expect(id).toBeTruthy()
      expect(typeof id).toBe('string')
    })

    // All should be unique
    const uniqueIDs = new Set(ptyIDs)
    expect(uniqueIDs.size).toBe(5)

    // Clean up
    await fetch(`${baseURL}/session/${sessionID}/pty`, { method: 'DELETE' })
  })

  test('should handle concurrent writes to same PTY', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['bash', '-l'])

    // Write multiple commands concurrently
    const promises = Array.from({ length: 5 }, (_, i) =>
      writeInput(baseURL, sessionID, ptyID, `echo "Concurrent ${i}"\n`),
    )

    await Promise.all(promises)
    await Bun.sleep(1000)

    // All should be in snapshot
    const snapshot = await getSnapshot(baseURL, sessionID, ptyID)
    for (let i = 0; i < 5; i++) {
      expect(snapshot).toContain(`Concurrent ${i}`)
    }

    // Clean up
    await killPTY(baseURL, sessionID, ptyID)
  }, 10000)

  test('should handle concurrent snapshot requests', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['bash', '-l'])

    await writeInput(baseURL, sessionID, ptyID, 'echo "Test"\n')
    await Bun.sleep(500)

    // Request snapshots concurrently
    const promises = Array.from({ length: 10 }, () =>
      getSnapshot(baseURL, sessionID, ptyID),
    )

    const snapshots = await Promise.all(promises)

    // All should succeed and be consistent
    expect(snapshots.length).toBe(10)
    const firstSnapshot = snapshots[0]
    snapshots.forEach((snapshot) => {
      expect(snapshot).toBe(firstSnapshot)
      expect(snapshot).toContain('Test')
    })

    // Clean up
    await killPTY(baseURL, sessionID, ptyID)
  }, 10000)

  test('should handle concurrent SSE connections', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['bash', '-l'])

    // Connect multiple SSE clients
    const readers = await Promise.all(
      Array.from({ length: 5 }, () =>
        connectSSE(`${baseURL}/session/${sessionID}/pty/${ptyID}/stream`),
      ),
    )

    try {
      // All should receive snapshot
      const snapshots = await Promise.all(
        readers.map((reader) => reader.readEvent()),
      )

      snapshots.forEach((event) => {
        expect(event!.event).toBe('snapshot')
      })

      // Write input - all should receive it
      await writeInput(baseURL, sessionID, ptyID, 'echo "Broadcast"\n')
      await Bun.sleep(500)

      // Each client should see the output
      for (const reader of readers) {
        let found = false
        for (let i = 0; i < 10; i++) {
          const event = await reader.readEvent(500)
          if (!event) continue
          if (event.event === 'data') {
            const data = JSON.parse(event.data!)
            if (data.data.includes('Broadcast')) {
              found = true
              break
            }
          }
        }
        expect(found).toBe(true)
      }
    } finally {
      // Clean up
      await Promise.all(readers.map((r) => r.close()))
      await killPTY(baseURL, sessionID, ptyID)
    }
  }, 15000)
})

describe('PTY Advanced - Stress Testing', () => {
  let server: Server<unknown>
  let baseURL: string

  beforeAll(async () => {
    server = await createTestServer()
    baseURL = `http://localhost:${server.port}`
  })

  afterAll(() => {
    server.stop()
  })

  test('should handle rapid PTY create/destroy cycles', async () => {
    const sessionID = randomSessionID()

    for (let i = 0; i < 10; i++) {
      const ptyID = await createPTY(baseURL, sessionID)
      await writeInput(baseURL, sessionID, ptyID, 'echo test\n')
      await Bun.sleep(100)
      await killPTY(baseURL, sessionID, ptyID)
    }

    // Session should be clean
    const list = await fetch(`${baseURL}/session/${sessionID}/pty`)
    const { ptys } = await list.json()
    expect(ptys.length).toBe(0)
  }, 15000)

  test('should handle large input strings', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['cat'])

    // Large input
    const largeInput = 'A'.repeat(5000)
    await writeInput(baseURL, sessionID, ptyID, largeInput)
    await Bun.sleep(500)

    const snapshot = await getSnapshot(baseURL, sessionID, ptyID)
    expect(snapshot).toContain('AAA')
    expect(snapshot.length).toBeGreaterThan(1000)

    // Clean up
    await killPTY(baseURL, sessionID, ptyID)
  }, 10000)

  test('should handle many rapid input writes', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['bash', '-l'])

    // Rapid writes
    for (let i = 0; i < 50; i++) {
      writeInput(baseURL, sessionID, ptyID, `echo ${i}\n`) // Don't await
    }

    await Bun.sleep(2000)

    const snapshot = await getSnapshot(baseURL, sessionID, ptyID)
    // Should contain at least some of the numbers
    const matches = snapshot.match(/\d+/g) || []
    expect(matches.length).toBeGreaterThan(10)

    // Clean up
    await killPTY(baseURL, sessionID, ptyID)
  }, 15000)

  test('should handle PTY with very long output', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['bash', '-l'])

    // Generate lots of output
    await writeInput(
      baseURL,
      sessionID,
      ptyID,
      'for i in {1..100}; do echo "Line $i with some extra text to make it longer"; done\n',
    )
    await Bun.sleep(3000)

    const snapshot = await getSnapshot(baseURL, sessionID, ptyID)
    expect(snapshot.length).toBeGreaterThan(1000)
    expect(snapshot).toContain('Line 1')
    expect(snapshot).toContain('Line 100')

    // Clean up
    await killPTY(baseURL, sessionID, ptyID)
  }, 15000)
})

describe('PTY Advanced - Error Recovery', () => {
  let server: Server<unknown>
  let baseURL: string

  beforeAll(async () => {
    server = await createTestServer()
    baseURL = `http://localhost:${server.port}`
  })

  afterAll(() => {
    server.stop()
  })

  test('should handle writes to exited PTY gracefully', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['bash', '-c', 'exit'])

    // Wait for PTY to exit
    await Bun.sleep(1000)

    // Try to write (should fail gracefully)
    const response = await fetch(
      `${baseURL}/session/${sessionID}/pty/${ptyID}/input`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: 'test\n' }),
      },
    )

    // Should either succeed (if still alive) or fail gracefully
    expect([200, 404, 500]).toContain(response.status)
  }, 10000)

  test('should handle snapshot request after PTY exit', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, [
      'bash',
      '-c',
      'echo done && exit',
    ])

    // Wait for exit
    await Bun.sleep(1000)

    // Should still get snapshot
    const snapshot = await getSnapshot(baseURL, sessionID, ptyID)
    expect(snapshot).toBeTruthy()
    expect(snapshot).toContain('done')

    // Clean up
    await killPTY(baseURL, sessionID, ptyID)
  }, 10000)

  test('should handle SSE connection to exited PTY', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, [
      'bash',
      '-c',
      'echo done && exit',
    ])

    // Wait for exit
    await Bun.sleep(1000)

    // Connect via SSE
    const reader = await connectSSE(
      `${baseURL}/session/${sessionID}/pty/${ptyID}/stream`,
    )

    try {
      // Should get snapshot
      const snapshot = await reader.readEvent(2000)
      expect(snapshot).toBeTruthy()

      // May get exit event
      const exitEvent = await reader.readEvent(2000)
      if (exitEvent) {
        expect(['exit', 'data']).toContain(exitEvent.event)
      }
    } finally {
      await reader.close()
    }
  }, 10000)
})
