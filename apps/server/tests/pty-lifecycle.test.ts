/**
 * E2E Tests - PTY Lifecycle (Create, List, Kill)
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import type { Server } from 'bun'
import {
  createTestServer,
  createPTY,
  killPTY,
  randomSessionID,
} from './helpers.js'

describe('PTY Lifecycle', () => {
  let server: Server<unknown>
  let baseURL: string

  beforeAll(async () => {
    server = await createTestServer()
    baseURL = `http://localhost:${server.port}`
  })

  afterAll(() => {
    server.stop()
  })

  test('should create a PTY session', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID)

    expect(ptyID).toBeTruthy()
    expect(typeof ptyID).toBe('string')

    // Clean up
    await killPTY(baseURL, sessionID, ptyID)
  })

  test('should create PTY with custom command', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID, ['echo', 'test'])

    expect(ptyID).toBeTruthy()

    // Clean up
    await killPTY(baseURL, sessionID, ptyID)
  })

  test('should list PTYs for a session', async () => {
    const sessionID = randomSessionID()

    // Create multiple PTYs
    const ptyID1 = await createPTY(baseURL, sessionID)
    const ptyID2 = await createPTY(baseURL, sessionID)

    // List PTYs
    const response = await fetch(`${baseURL}/session/${sessionID}/pty`)
    expect(response.ok).toBe(true)

    const { ptys } = await response.json()
    expect(ptys).toContain(ptyID1)
    expect(ptys).toContain(ptyID2)
    expect(ptys.length).toBe(2)

    // Clean up
    await killPTY(baseURL, sessionID, ptyID1)
    await killPTY(baseURL, sessionID, ptyID2)
  })

  test('should kill a specific PTY', async () => {
    const sessionID = randomSessionID()
    const ptyID = await createPTY(baseURL, sessionID)

    // Kill PTY
    const response = await fetch(
      `${baseURL}/session/${sessionID}/pty/${ptyID}`,
      {
        method: 'DELETE',
      },
    )
    expect(response.ok).toBe(true)

    const result = await response.json()
    expect(result.success).toBe(true)

    // Verify PTY is gone
    const listResponse = await fetch(`${baseURL}/session/${sessionID}/pty`)
    const { ptys } = await listResponse.json()
    expect(ptys).not.toContain(ptyID)
  })

  test('should kill all PTYs for a session', async () => {
    const sessionID = randomSessionID()

    // Create multiple PTYs
    await createPTY(baseURL, sessionID)
    await createPTY(baseURL, sessionID)

    // Kill all
    const response = await fetch(`${baseURL}/session/${sessionID}/pty`, {
      method: 'DELETE',
    })
    expect(response.ok).toBe(true)

    // Verify all are gone
    const listResponse = await fetch(`${baseURL}/session/${sessionID}/pty`)
    const { ptys } = await listResponse.json()
    expect(ptys.length).toBe(0)
  })

  test('should return 404 for non-existent PTY', async () => {
    const sessionID = randomSessionID()
    const fakeID = crypto.randomUUID()

    const response = await fetch(
      `${baseURL}/session/${sessionID}/pty/${fakeID}/snapshot`,
    )
    expect(response.status).toBe(404)
  })

  test('should validate PTY creation request', async () => {
    const sessionID = randomSessionID()

    // Missing cmd
    const response1 = await fetch(`${baseURL}/session/${sessionID}/pty`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cols: 80, rows: 24 }),
    })
    expect(response1.status).toBe(400)

    // Invalid cmd type
    const response2 = await fetch(`${baseURL}/session/${sessionID}/pty`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cmd: 'bash', cols: 80, rows: 24 }),
    })
    expect(response2.status).toBe(400)

    // Missing cols/rows
    const response3 = await fetch(`${baseURL}/session/${sessionID}/pty`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cmd: ['bash'] }),
    })
    expect(response3.status).toBe(400)
  })

  test('should create multiple PTYs in different sessions', async () => {
    const session1 = randomSessionID()
    const session2 = randomSessionID()

    const ptyID1 = await createPTY(baseURL, session1)
    const ptyID2 = await createPTY(baseURL, session2)

    // Verify isolation
    const list1 = await fetch(`${baseURL}/session/${session1}/pty`)
    const { ptys: ptys1 } = await list1.json()
    expect(ptys1).toContain(ptyID1)
    expect(ptys1).not.toContain(ptyID2)

    const list2 = await fetch(`${baseURL}/session/${session2}/pty`)
    const { ptys: ptys2 } = await list2.json()
    expect(ptys2).toContain(ptyID2)
    expect(ptys2).not.toContain(ptyID1)

    // Clean up
    await killPTY(baseURL, session1, ptyID1)
    await killPTY(baseURL, session2, ptyID2)
  })

  test('should handle PTY with custom cwd and env', async () => {
    const sessionID = randomSessionID()

    const response = await fetch(`${baseURL}/session/${sessionID}/pty`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cmd: ['bash', '-l'],
        cwd: '/tmp',
        env: { CUSTOM_VAR: 'test_value' },
        cols: 80,
        rows: 24,
      }),
    })

    expect(response.ok).toBe(true)
    const { ptyID } = await response.json()
    expect(ptyID).toBeTruthy()

    // Clean up
    await killPTY(baseURL, sessionID, ptyID)
  })
})
