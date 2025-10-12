/**
 * E2E Tests - PTY Input/Output
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

describe('PTY Input/Output', () => {
  let server: Server<unknown>
  let baseURL: string

  beforeAll(async () => {
    server = await createTestServer()
    baseURL = `http://localhost:${server.port}`
  })

  afterAll(() => {
    server.stop()
  })

  test('should write input to PTY', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['bash', '-l'])

    // Write input
    await writeInput(baseURL, sessionID, ptyID, 'echo test\n')

    // Wait for output
    await Bun.sleep(500)

    // Get snapshot to verify output
    const snapshot = await getSnapshot(baseURL, sessionID, ptyID)
    expect(snapshot).toBeTruthy()
    expect(snapshot).toContain('test')

    // Clean up
    await killPTY(baseURL, sessionID, ptyID)
  }, 10000)

  test('should handle multiple input writes', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['bash', '-l'])

    // Write multiple commands
    await writeInput(baseURL, sessionID, ptyID, 'echo first\n')
    await Bun.sleep(200)
    await writeInput(baseURL, sessionID, ptyID, 'echo second\n')
    await Bun.sleep(200)
    await writeInput(baseURL, sessionID, ptyID, 'echo third\n')
    await Bun.sleep(500)

    // Get snapshot
    const snapshot = await getSnapshot(baseURL, sessionID, ptyID)
    expect(snapshot).toContain('first')
    expect(snapshot).toContain('second')
    expect(snapshot).toContain('third')

    // Clean up
    await killPTY(baseURL, sessionID, ptyID)
  }, 10000)

  test('should handle input with special characters', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['bash', '-l'])

    // Write input with special chars
    await writeInput(
      baseURL,
      sessionID,
      ptyID,
      'echo "Hello $USER @ $(date)"\n',
    )
    await Bun.sleep(500)

    const snapshot = await getSnapshot(baseURL, sessionID, ptyID)
    expect(snapshot).toContain('Hello')

    // Clean up
    await killPTY(baseURL, sessionID, ptyID)
  }, 10000)

  test('should receive output via SSE after writing input', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['bash', '-l'])

    // Connect to stream
    const sseReader = await connectSSE(
      `${baseURL}/session/${sessionID}/pty/${ptyID}/stream`,
    )

    try {
      // Read snapshot
      const snapshot = await sseReader.readEvent()
      expect(snapshot!.event).toBe('snapshot')

      // Write input
      await writeInput(baseURL, sessionID, ptyID, 'echo streaming test\n')

      // Should receive data events with the output
      let foundOutput = false
      for (let i = 0; i < 20; i++) {
        const event = await sseReader.readEvent(500)
        if (!event) continue

        if (event.event === 'data') {
          const data = JSON.parse(event.data!)
          if (data.data.includes('streaming test')) {
            foundOutput = true
            break
          }
        }
      }

      expect(foundOutput).toBe(true)
    } finally {
      await sseReader.close()
      await killPTY(baseURL, sessionID, ptyID)
    }
  }, 10000)

  test('should validate input request', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID)

    // Missing data field
    const response1 = await fetch(
      `${baseURL}/session/${sessionID}/pty/${ptyID}/input`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
    )
    expect(response1.status).toBe(400)

    // Invalid data type
    const response2 = await fetch(
      `${baseURL}/session/${sessionID}/pty/${ptyID}/input`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: 123 }),
      },
    )
    expect(response2.status).toBe(400)

    // Clean up
    await killPTY(baseURL, sessionID, ptyID)
  })

  test('should return 404 for input to non-existent PTY', async () => {
    const sessionID = randomSessionID()
    const fakeID = crypto.randomUUID()

    const response = await fetch(
      `${baseURL}/session/${sessionID}/pty/${fakeID}/input`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: 'test\n' }),
      },
    )
    expect(response.status).toBe(404)
  })

  test('should handle large input', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['bash', '-l'])

    // Large input string
    const largeInput = 'echo "' + 'A'.repeat(1000) + '"\n'
    await writeInput(baseURL, sessionID, ptyID, largeInput)

    await Bun.sleep(500)

    const snapshot = await getSnapshot(baseURL, sessionID, ptyID)
    expect(snapshot.length).toBeGreaterThan(100)

    // Clean up
    await killPTY(baseURL, sessionID, ptyID)
  }, 10000)

  test('should handle rapid input writes', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['bash', '-l'])

    // Write many commands rapidly
    const promises = []
    for (let i = 0; i < 10; i++) {
      promises.push(writeInput(baseURL, sessionID, ptyID, `echo ${i}\n`))
    }
    await Promise.all(promises)

    await Bun.sleep(1000)

    const snapshot = await getSnapshot(baseURL, sessionID, ptyID)
    // Should contain at least some of the numbers
    let foundCount = 0
    for (let i = 0; i < 10; i++) {
      if (snapshot.includes(i.toString())) {
        foundCount++
      }
    }
    expect(foundCount).toBeGreaterThan(0)

    // Clean up
    await killPTY(baseURL, sessionID, ptyID)
  }, 10000)

  test('should handle exit command', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['bash', '-l'])

    const sseReader = await connectSSE(
      `${baseURL}/session/${sessionID}/pty/${ptyID}/stream`,
    )

    try {
      // Read snapshot
      await sseReader.readEvent()

      // Send exit command
      await writeInput(baseURL, sessionID, ptyID, 'exit\n')

      // Should receive exit event
      let exitReceived = false
      for (let i = 0; i < 20; i++) {
        const event = await sseReader.readEvent(500)
        if (!event) continue

        if (event.event === 'exit') {
          exitReceived = true
          break
        }
      }

      expect(exitReceived).toBe(true)
    } finally {
      await sseReader.close()
    }
  }, 10000)
})
