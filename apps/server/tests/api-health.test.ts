/**
 * E2E Tests - API Health and Basic Endpoints
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import type { Server } from 'bun'
import { createTestServer } from './helpers.js'

describe('API Health', () => {
  let server: Server<unknown>
  let baseURL: string

  beforeAll(async () => {
    server = await createTestServer()
    baseURL = `http://localhost:${server.port}`
  })

  afterAll(() => {
    server.stop()
  })

  test('should respond to root endpoint', async () => {
    const response = await fetch(`${baseURL}/`)
    expect(response.ok).toBe(true)

    const data = await response.json()
    expect(data.name).toBe('@open-composer/server')
    expect(data.version).toBeTruthy()
    expect(data.description).toBeTruthy()
    expect(data.runtime).toBe('bun')
    expect(data.endpoints).toBeTruthy()
  })

  test('should respond to health endpoint', async () => {
    const response = await fetch(`${baseURL}/health`)
    expect(response.ok).toBe(true)

    const data = await response.json()
    expect(data.status).toBe('ok')
    expect(data.uptime).toBeGreaterThan(0)
    expect(data.timestamp).toBeTruthy()
    expect(data.runtime).toBe('bun')
  })

  test('should return 404 for unknown endpoints', async () => {
    const response = await fetch(`${baseURL}/unknown-endpoint`)
    expect(response.status).toBe(404)
  })

  test('should handle CORS', async () => {
    const response = await fetch(`${baseURL}/`, {
      method: 'OPTIONS',
    })
    expect(response.ok).toBe(true)
  })

  test('should return JSON content type', async () => {
    const response = await fetch(`${baseURL}/`)
    expect(response.headers.get('content-type')).toContain('application/json')
  })

  test('should handle concurrent requests', async () => {
    const requests = Array.from({ length: 10 }, () =>
      fetch(`${baseURL}/health`),
    )

    const responses = await Promise.all(requests)
    responses.forEach((response) => {
      expect(response.ok).toBe(true)
    })
  })

  test('should track uptime correctly', async () => {
    const response1 = await fetch(`${baseURL}/health`)
    const data1 = await response1.json()
    const uptime1 = data1.uptime

    await Bun.sleep(1000)

    const response2 = await fetch(`${baseURL}/health`)
    const data2 = await response2.json()
    const uptime2 = data2.uptime

    expect(uptime2).toBeGreaterThan(uptime1)
  })

  test('should handle malformed JSON gracefully', async () => {
    const response = await fetch(`${baseURL}/session/test/pty`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json{',
    })

    // Should return an error status
    expect(response.ok).toBe(false)
  })

  test('should have correct API documentation in root', async () => {
    const response = await fetch(`${baseURL}/`)
    const data = await response.json()

    const expectedEndpoints = [
      'POST /session/:sid/pty',
      'GET /session/:sid/pty',
      'GET /session/:sid/pty/:id/stream',
      'POST /session/:sid/pty/:id/input',
      'POST /session/:sid/pty/:id/resize',
      'GET /session/:sid/pty/:id/snapshot',
      'DELETE /session/:sid/pty/:id',
      'DELETE /session/:sid/pty',
      'GET /health',
    ]

    expectedEndpoints.forEach((endpoint) => {
      expect(data.endpoints).toHaveProperty(endpoint)
    })
  })
})
