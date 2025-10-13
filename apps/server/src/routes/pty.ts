/**
 * PTY Routes (Elysia) - HTTP endpoints for managing terminal sessions
 *
 * Provides RESTful API + SSE streaming for server-managed PTYs using Bun's subprocess
 */

import { Elysia } from 'elysia'
import { ptyService } from '../services/pty-service.js'
import type {
  CreatePTYRequest,
  PTYInputRequest,
  PTYResizeRequest,
} from '../types/pty.js'

export const ptyRoutes = new Elysia({ prefix: '/session/:sid/pty' })
  /**
   * Create a new PTY session
   * POST /session/:sid/pty
   */
  .post('/', async ({ params, body, set }) => {
    const sessionID = params.sid
    const req = body as CreatePTYRequest

    // Validate request
    if (!req.cmd || !Array.isArray(req.cmd) || req.cmd.length === 0) {
      set.status = 400
      return { error: 'Invalid cmd: must be non-empty array' }
    }

    if (typeof req.cols !== 'number' || typeof req.rows !== 'number') {
      set.status = 400
      return { error: 'cols and rows must be numbers' }
    }

    // Create PTY
    const result = ptyService.create(sessionID, req)
    return result
  })

  /**
   * Stream PTY output via Server-Sent Events
   * GET /session/:sid/pty/:id/stream
   *
   * First emits a 'snapshot' event with serialized state,
   * then streams live 'data' events with incremental output
   */
  .get('/:id/stream', async ({ params, set }) => {
    const ptyID = params.id
    const handle = ptyService.getHandle(ptyID)

    if (!handle) {
      set.status = 404
      return { error: 'PTY not found' }
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
        Connection: 'keep-alive',
      },
    })
  })

  /**
   * Write input to a PTY
   * POST /session/:sid/pty/:id/input
   */
  .post('/:id/input', async ({ params, body, set }) => {
    const ptyID = params.id
    const req = body as PTYInputRequest

    if (typeof req.data !== 'string') {
      set.status = 400
      return { error: 'data must be a string' }
    }

    const success = await ptyService.writeInput(ptyID, req)
    if (!success) {
      set.status = 404
      return { error: 'PTY not found' }
    }

    return { success: true }
  })

  /**
   * Resize a PTY
   * POST /session/:sid/pty/:id/resize
   */
  .post('/:id/resize', async ({ params, body, set }) => {
    const ptyID = params.id
    const req = body as PTYResizeRequest

    if (typeof req.cols !== 'number' || typeof req.rows !== 'number') {
      set.status = 400
      return { error: 'cols and rows must be numbers' }
    }

    const success = ptyService.resize(ptyID, req)
    if (!success) {
      set.status = 404
      return { error: 'PTY not found' }
    }

    return { success: true }
  })

  /**
   * Get a serialized snapshot of the terminal state
   * GET /session/:sid/pty/:id/snapshot
   */
  .get('/:id/snapshot', ({ params, set }) => {
    const ptyID = params.id
    const snapshot = ptyService.getSnapshot(ptyID)

    if (!snapshot) {
      set.status = 404
      return { error: 'PTY not found' }
    }

    return snapshot
  })

  /**
   * Kill a PTY
   * DELETE /session/:sid/pty/:id
   */
  .delete('/:id', ({ params, set }) => {
    const ptyID = params.id
    const success = ptyService.kill(ptyID)

    if (!success) {
      set.status = 404
      return { error: 'PTY not found' }
    }

    return { success: true }
  })

  /**
   * List all PTYs for a session
   * GET /session/:sid/pty
   */
  .get('/', ({ params }) => {
    const sessionID = params.sid
    const ptyIDs = ptyService.listPTYs(sessionID)

    return { ptys: ptyIDs }
  })

  /**
   * Kill all PTYs for a session
   * DELETE /session/:sid/pty
   */
  .delete('/', ({ params }) => {
    const sessionID = params.sid
    ptyService.killSession(sessionID)

    return { success: true }
  })
