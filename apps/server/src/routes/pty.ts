/**
 * PTY Routes (Bun-native) - HTTP endpoints for managing terminal sessions
 *
 * Provides RESTful API + SSE streaming for server-managed PTYs using Bun's subprocess
 */

import { Hono } from 'hono'
import { ptyService } from '../services/pty-service.js'
import type {
  CreatePTYRequest,
  PTYInputRequest,
  PTYResizeRequest,
} from '../types/pty.js'

export const ptyRoutes = new Hono()

/**
 * Create a new PTY session
 * POST /session/:sid/pty
 */
ptyRoutes.post('/session/:sid/pty', async (c) => {
  const sessionID = c.req.param('sid')
  const body = await c.req.json<CreatePTYRequest>()

  // Validate request
  if (!body.cmd || !Array.isArray(body.cmd) || body.cmd.length === 0) {
    return c.json({ error: 'Invalid cmd: must be non-empty array' }, 400)
  }

  if (typeof body.cols !== 'number' || typeof body.rows !== 'number') {
    return c.json({ error: 'cols and rows must be numbers' }, 400)
  }

  // Create PTY
  const result = ptyService.create(sessionID, body)
  return c.json(result)
})

/**
 * Stream PTY output via Server-Sent Events
 * GET /session/:sid/pty/:id/stream
 *
 * First emits a 'snapshot' event with serialized state,
 * then streams live 'data' events with incremental output
 */
ptyRoutes.get('/session/:sid/pty/:id/stream', async (c) => {
  const ptyID = c.req.param('id')
  const handle = ptyService.getHandle(ptyID)

  if (!handle) {
    return c.notFound()
  }

  // Create SSE stream
  let sseController: ReadableStreamDefaultController<Uint8Array> | null = null

  const stream = new ReadableStream({
    start(controller) {
      sseController = controller
      const encoder = new TextEncoder()

      // Helper to send SSE events
      const sendEvent = (event: string, data: unknown) => {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
        try {
          controller.enqueue(encoder.encode(payload))
        } catch (e) {
          // Controller closed
        }
      }

      // Send initial snapshot for instant rendering
      const snapshot = handle.ser.serialize()
      sendEvent('snapshot', { data: snapshot })

      // Register this controller to receive broadcasts
      handle.sseControllers.add(controller)

      // If process already exited, send exit event immediately
      if (handle.proc.killed || handle.proc.exitCode !== null) {
        sendEvent('exit', { code: handle.proc.exitCode || 0 })
        controller.close()
        handle.sseControllers.delete(controller)
      }
    },
    cancel() {
      // Remove controller when client disconnects
      if (sseController) {
        handle.sseControllers.delete(sseController)
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
})

/**
 * Write input to a PTY
 * POST /session/:sid/pty/:id/input
 */
ptyRoutes.post('/session/:sid/pty/:id/input', async (c) => {
  const ptyID = c.req.param('id')
  const body = await c.req.json<PTYInputRequest>()

  if (typeof body.data !== 'string') {
    return c.json({ error: 'data must be a string' }, 400)
  }

  const success = await ptyService.writeInput(ptyID, body)
  if (!success) {
    return c.notFound()
  }

  return c.json({ success: true })
})

/**
 * Resize a PTY
 * POST /session/:sid/pty/:id/resize
 */
ptyRoutes.post('/session/:sid/pty/:id/resize', async (c) => {
  const ptyID = c.req.param('id')
  const body = await c.req.json<PTYResizeRequest>()

  if (typeof body.cols !== 'number' || typeof body.rows !== 'number') {
    return c.json({ error: 'cols and rows must be numbers' }, 400)
  }

  const success = ptyService.resize(ptyID, body)
  if (!success) {
    return c.notFound()
  }

  return c.json({ success: true })
})

/**
 * Get a serialized snapshot of the terminal state
 * GET /session/:sid/pty/:id/snapshot
 */
ptyRoutes.get('/session/:sid/pty/:id/snapshot', (c) => {
  const ptyID = c.req.param('id')
  const snapshot = ptyService.getSnapshot(ptyID)

  if (!snapshot) {
    return c.notFound()
  }

  return c.json(snapshot)
})

/**
 * Kill a PTY
 * DELETE /session/:sid/pty/:id
 */
ptyRoutes.delete('/session/:sid/pty/:id', (c) => {
  const ptyID = c.req.param('id')
  const success = ptyService.kill(ptyID)

  if (!success) {
    return c.notFound()
  }

  return c.json({ success: true })
})

/**
 * List all PTYs for a session
 * GET /session/:sid/pty
 */
ptyRoutes.get('/session/:sid/pty', (c) => {
  const sessionID = c.req.param('sid')
  const ptyIDs = ptyService.listPTYs(sessionID)

  return c.json({ ptys: ptyIDs })
})

/**
 * Kill all PTYs for a session
 * DELETE /session/:sid/pty
 */
ptyRoutes.delete('/session/:sid/pty', (c) => {
  const sessionID = c.req.param('sid')
  ptyService.killSession(sessionID)

  return c.json({ success: true })
})
