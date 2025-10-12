/**
 * E2E Tests - PTY Streaming (SSE)
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import type { Server } from 'bun'
import {
  createTestServer,
  createPTY,
  killPTY,
  connectSSE,
  randomSessionID,
} from './helpers.js'

describe('PTY Streaming', () => {
  let server: Server<unknown>
  let baseURL: string

  beforeAll(async () => {
    server = await createTestServer()
    baseURL = `http://localhost:${server.port}`
  })

  afterAll(() => {
    server.stop()
  })

  test('should stream PTY output via SSE', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['echo', 'hello world'])

    // Connect to stream
    const sseReader = await connectSSE(
      `${baseURL}/session/${sessionID}/pty/${ptyID}/stream`,
    )

    try {
      // Should receive snapshot event first
      const snapshotEvent = await sseReader.readEvent()
      expect(snapshotEvent).toBeTruthy()
      expect(snapshotEvent!.event).toBe('snapshot')
      expect(snapshotEvent!.data).toBeTruthy()

      // Parse snapshot data
      const snapshotData = JSON.parse(snapshotEvent!.data!)
      expect(snapshotData.data).toBeTruthy()

      // Should receive data events with output
      let receivedOutput = false
      for (let i = 0; i < 10; i++) {
        const event = await sseReader.readEvent(1000)
        if (!event) break

        if (event.event === 'data') {
          receivedOutput = true
          const data = JSON.parse(event.data!)
          expect(data.data).toBeTruthy()
        } else if (event.event === 'exit') {
          break
        }
      }

      expect(receivedOutput).toBe(true)
    } finally {
      await sseReader.close()
      await killPTY(baseURL, sessionID, ptyID)
    }
  }, 10000)

  test('should receive exit event when PTY exits', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['echo', 'test'])

    const sseReader = await connectSSE(
      `${baseURL}/session/${sessionID}/pty/${ptyID}/stream`,
    )

    try {
      let exitReceived = false

      // Read events until exit
      for (let i = 0; i < 20; i++) {
        const event = await sseReader.readEvent(1000)
        if (!event) break

        if (event.event === 'exit') {
          exitReceived = true
          const data = JSON.parse(event.data!)
          expect(data.code).toBeDefined()
          break
        }
      }

      expect(exitReceived).toBe(true)
    } finally {
      await sseReader.close()
    }
  }, 10000)

  test('should support multiple SSE clients for same PTY', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['bash', '-l'])

    // Connect multiple clients
    const reader1 = await connectSSE(
      `${baseURL}/session/${sessionID}/pty/${ptyID}/stream`,
    )
    const reader2 = await connectSSE(
      `${baseURL}/session/${sessionID}/pty/${ptyID}/stream`,
    )

    try {
      // Both should receive snapshot
      const snapshot1 = await reader1.readEvent()
      const snapshot2 = await reader2.readEvent()

      expect(snapshot1!.event).toBe('snapshot')
      expect(snapshot2!.event).toBe('snapshot')
    } finally {
      await reader1.close()
      await reader2.close()
      await killPTY(baseURL, sessionID, ptyID)
    }
  })

  test('should return 404 for non-existent PTY stream', async () => {
    const sessionID = randomSessionID()
    const fakeID = crypto.randomUUID()

    const response = await fetch(
      `${baseURL}/session/${sessionID}/pty/${fakeID}/stream`,
    )
    expect(response.status).toBe(404)
  })

  test('should handle SSE connection close gracefully', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['bash', '-l'])

    const sseReader = await connectSSE(
      `${baseURL}/session/${sessionID}/pty/${ptyID}/stream`,
    )

    // Read snapshot
    const snapshot = await sseReader.readEvent()
    expect(snapshot!.event).toBe('snapshot')

    // Close connection
    await sseReader.close()

    // PTY should still be alive
    const listResponse = await fetch(`${baseURL}/session/${sessionID}/pty`)
    const { ptys } = await listResponse.json()
    expect(ptys).toContain(ptyID)

    // Clean up
    await killPTY(baseURL, sessionID, ptyID)
  })

  test('should stream output from long-running process', async () => {
    const sessionID = randomSessionID()
    // Use bash to echo multiple lines
    const ptyID = await createPTY(baseURL, sessionID, ['bash', '-l'])

    const sseReader = await connectSSE(
      `${baseURL}/session/${sessionID}/pty/${ptyID}/stream`,
    )

    try {
      // Read snapshot
      const snapshot = await sseReader.readEvent()
      expect(snapshot!.event).toBe('snapshot')

      // Wait for some initial output
      await Bun.sleep(500)

      // Should be able to read some data
      const events = await sseReader.readEvents(1, 2000)
      expect(events.length).toBeGreaterThan(0)
    } finally {
      await sseReader.close()
      await killPTY(baseURL, sessionID, ptyID)
    }
  }, 10000)
})
