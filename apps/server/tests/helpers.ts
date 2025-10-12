/**
 * Test helpers and utilities for E2E testing
 */

import type { Server } from 'bun'

/**
 * Wait for a condition to be true with timeout
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100,
): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return
    }
    await Bun.sleep(interval)
  }
  throw new Error(`Timeout waiting for condition after ${timeout}ms`)
}

/**
 * Create a test server instance
 */
export async function createTestServer(port = 0): Promise<Server<unknown>> {
  const { default: app } = await import('../src/index.js')
  return Bun.serve({
    port,
    fetch: app.fetch,
  })
}

/**
 * SSE event parser
 */
export interface SSEEvent {
  event?: string
  data?: string
  id?: string
}

export class SSEReader {
  private decoder = new TextDecoder()
  private buffer = ''
  private events: SSEEvent[] = []
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null

  constructor(response: Response) {
    if (!response.body) {
      throw new Error('Response body is null')
    }
    this.reader = response.body.getReader()
  }

  async readEvent(timeout = 5000): Promise<SSEEvent | null> {
    const start = Date.now()

    while (Date.now() - start < timeout) {
      // Return cached event if available
      if (this.events.length > 0) {
        return this.events.shift()!
      }

      // Read more data
      if (!this.reader) break

      const { done, value } = await this.reader.read()
      if (done) {
        this.reader = null
        break
      }

      this.buffer += this.decoder.decode(value, { stream: true })

      // Parse events from buffer
      const lines = this.buffer.split('\n')
      this.buffer = lines.pop() || '' // Keep incomplete line in buffer

      let currentEvent: SSEEvent = {}

      for (const line of lines) {
        if (line.trim() === '') {
          // Empty line marks end of event
          if (Object.keys(currentEvent).length > 0) {
            this.events.push(currentEvent)
            currentEvent = {}
          }
        } else if (line.startsWith('event:')) {
          currentEvent.event = line.slice(6).trim()
        } else if (line.startsWith('data:')) {
          currentEvent.data = line.slice(5).trim()
        } else if (line.startsWith('id:')) {
          currentEvent.id = line.slice(3).trim()
        }
      }

      // Return event if we parsed one
      if (this.events.length > 0) {
        return this.events.shift()!
      }
    }

    return null
  }

  async readEvents(count: number, timeout = 5000): Promise<SSEEvent[]> {
    const events: SSEEvent[] = []
    const start = Date.now()

    while (events.length < count && Date.now() - start < timeout) {
      const event = await this.readEvent(timeout - (Date.now() - start))
      if (!event) break
      events.push(event)
    }

    return events
  }

  async close(): Promise<void> {
    if (this.reader) {
      await this.reader.cancel()
      this.reader = null
    }
  }
}

/**
 * Create an SSE connection
 */
export async function connectSSE(url: string): Promise<SSEReader> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`SSE connection failed: ${response.status}`)
  }
  return new SSEReader(response)
}

/**
 * Helper to create a PTY and return its ID
 */
export async function createPTY(
  baseURL: string,
  sessionID: string,
  cmd = ['bash', '-l'],
  cols = 80,
  rows = 24,
): Promise<string> {
  const response = await fetch(`${baseURL}/session/${sessionID}/pty`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cmd, cols, rows }),
  })

  if (!response.ok) {
    throw new Error(`Failed to create PTY: ${response.status}`)
  }

  const { ptyID } = await response.json()
  return ptyID
}

/**
 * Helper to write input to a PTY
 */
export async function writeInput(
  baseURL: string,
  sessionID: string,
  ptyID: string,
  data: string,
): Promise<void> {
  const response = await fetch(
    `${baseURL}/session/${sessionID}/pty/${ptyID}/input`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    },
  )

  if (!response.ok) {
    throw new Error(`Failed to write input: ${response.status}`)
  }
}

/**
 * Helper to get snapshot
 */
export async function getSnapshot(
  baseURL: string,
  sessionID: string,
  ptyID: string,
): Promise<string> {
  const response = await fetch(
    `${baseURL}/session/${sessionID}/pty/${ptyID}/snapshot`,
  )

  if (!response.ok) {
    throw new Error(`Failed to get snapshot: ${response.status}`)
  }

  const { data } = await response.json()
  return data
}

/**
 * Helper to kill PTY
 */
export async function killPTY(
  baseURL: string,
  sessionID: string,
  ptyID: string,
): Promise<void> {
  const response = await fetch(
    `${baseURL}/session/${sessionID}/pty/${ptyID}`,
    {
      method: 'DELETE',
    },
  )

  if (!response.ok) {
    throw new Error(`Failed to kill PTY: ${response.status}`)
  }
}

/**
 * Generate random session ID
 */
export function randomSessionID(): string {
  return `test-${crypto.randomUUID()}`
}
