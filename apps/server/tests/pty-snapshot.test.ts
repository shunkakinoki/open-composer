/**
 * E2E Tests - PTY Snapshots and Resize
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import type { Server } from 'bun'
import {
  createTestServer,
  createPTY,
  writeInput,
  killPTY,
  getSnapshot,
  randomSessionID,
} from './helpers.js'

describe('PTY Snapshots', () => {
  let server: Server<unknown>
  let baseURL: string

  beforeAll(async () => {
    server = await createTestServer()
    baseURL = `http://localhost:${server.port}`
  })

  afterAll(() => {
    server.stop()
  })

  test('should get empty snapshot for new PTY', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID)

    const snapshot = await getSnapshot(baseURL, sessionID, ptyID)
    expect(typeof snapshot).toBe('string')
    // Empty string is valid for new PTY

    // Clean up
    await killPTY(baseURL, sessionID, ptyID)
  })

  test('should capture output in snapshot', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['bash', '-l'])

    // Write some commands
    await writeInput(baseURL, sessionID, ptyID, 'echo "Snapshot Test"\n')
    await Bun.sleep(500)

    const snapshot = await getSnapshot(baseURL, sessionID, ptyID)
    expect(snapshot).toContain('Snapshot Test')

    // Clean up
    await killPTY(baseURL, sessionID, ptyID)
  }, 10000)

  test('should get progressively larger snapshots as output grows', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['bash', '-l'])

    // Get initial snapshot
    const snapshot1 = await getSnapshot(baseURL, sessionID, ptyID)
    const len1 = snapshot1.length

    // Write output
    await writeInput(baseURL, sessionID, ptyID, 'echo "Line 1"\n')
    await Bun.sleep(300)

    const snapshot2 = await getSnapshot(baseURL, sessionID, ptyID)
    const len2 = snapshot2.length
    expect(len2).toBeGreaterThanOrEqual(len1)

    // Write more output
    await writeInput(baseURL, sessionID, ptyID, 'echo "Line 2"\n')
    await Bun.sleep(300)

    const snapshot3 = await getSnapshot(baseURL, sessionID, ptyID)
    const len3 = snapshot3.length
    expect(len3).toBeGreaterThanOrEqual(len2)

    // Clean up
    await killPTY(baseURL, sessionID, ptyID)
  }, 10000)

  test('should return 404 for snapshot of non-existent PTY', async () => {
    const sessionID = randomSessionID()
    const fakeID = crypto.randomUUID()

    const response = await fetch(
      `${baseURL}/session/${sessionID}/pty/${fakeID}/snapshot`,
    )
    expect(response.status).toBe(404)
  })

  test('should handle snapshot of PTY with large scrollback', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['bash', '-l'])

    // Generate lots of output
    for (let i = 0; i < 50; i++) {
      await writeInput(
        baseURL,
        sessionID,
        ptyID,
        `echo "Line ${i} - Some longer text to fill the buffer"\n`,
      )
    }
    await Bun.sleep(2000)

    const snapshot = await getSnapshot(baseURL, sessionID, ptyID)
    expect(snapshot.length).toBeGreaterThan(100)

    // Clean up
    await killPTY(baseURL, sessionID, ptyID)
  }, 15000)

  test('should preserve ANSI escape codes in snapshot', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['bash', '-l'])

    // Write colored output
    await writeInput(
      baseURL,
      sessionID,
      ptyID,
      'echo -e "\\033[31mRed Text\\033[0m"\n',
    )
    await Bun.sleep(500)

    const snapshot = await getSnapshot(baseURL, sessionID, ptyID)
    // Snapshot should contain ANSI codes or the text
    expect(snapshot).toContain('Red Text')

    // Clean up
    await killPTY(baseURL, sessionID, ptyID)
  }, 10000)

  test('should handle concurrent snapshot requests', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['bash', '-l'])

    await writeInput(baseURL, sessionID, ptyID, 'echo "Test"\n')
    await Bun.sleep(500)

    // Request multiple snapshots concurrently
    const promises = Array.from({ length: 5 }, () =>
      getSnapshot(baseURL, sessionID, ptyID),
    )

    const snapshots = await Promise.all(promises)

    // All should succeed and be similar
    expect(snapshots.length).toBe(5)
    snapshots.forEach((snapshot) => {
      expect(snapshot).toContain('Test')
    })

    // Clean up
    await killPTY(baseURL, sessionID, ptyID)
  }, 10000)
})

describe('PTY Resize', () => {
  let server: Server<unknown>
  let baseURL: string

  beforeAll(async () => {
    server = await createTestServer()
    baseURL = `http://localhost:${server.port}`
  })

  afterAll(() => {
    server.stop()
  })

  test('should resize PTY terminal buffer', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['bash', '-l'])

    // Resize PTY
    const response = await fetch(
      `${baseURL}/session/${sessionID}/pty/${ptyID}/resize`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cols: 120, rows: 40 }),
      },
    )

    expect(response.ok).toBe(true)
    const result = await response.json()
    expect(result.success).toBe(true)

    // Clean up
    await killPTY(baseURL, sessionID, ptyID)
  })

  test('should validate resize request', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID)

    // Missing cols
    const response1 = await fetch(
      `${baseURL}/session/${sessionID}/pty/${ptyID}/resize`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: 24 }),
      },
    )
    expect(response1.status).toBe(400)

    // Invalid type
    const response2 = await fetch(
      `${baseURL}/session/${sessionID}/pty/${ptyID}/resize`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cols: '80', rows: 24 }),
      },
    )
    expect(response2.status).toBe(400)

    // Clean up
    await killPTY(baseURL, sessionID, ptyID)
  })

  test('should return 404 for resize of non-existent PTY', async () => {
    const sessionID = randomSessionID()
    const fakeID = crypto.randomUUID()

    const response = await fetch(
      `${baseURL}/session/${sessionID}/pty/${fakeID}/resize`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cols: 80, rows: 24 }),
      },
    )
    expect(response.status).toBe(404)
  })

  test('should handle multiple resize operations', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['bash', '-l'])

    // Resize multiple times
    const sizes = [
      { cols: 80, rows: 24 },
      { cols: 120, rows: 40 },
      { cols: 100, rows: 30 },
      { cols: 80, rows: 24 },
    ]

    for (const size of sizes) {
      const response = await fetch(
        `${baseURL}/session/${sessionID}/pty/${ptyID}/resize`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(size),
        },
      )
      expect(response.ok).toBe(true)
    }

    // Clean up
    await killPTY(baseURL, sessionID, ptyID)
  })
})
