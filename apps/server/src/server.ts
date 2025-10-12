/**
 * OpenComposer Server - PTY-as-a-Service (Elysia + Bun)
 *
 * Exported server creation and startup functions for programmatic use
 */

import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { openapi } from '@elysiajs/openapi'
import { ptyRoutes } from './routes/pty.js'
import { ptyService } from './services/pty-service.js'

export interface ServerOptions {
  port?: number
  cleanupInterval?: number
  maxIdleTime?: number
}

/**
 * Create the Elysia app with all routes and middleware
 */
export function createApp() {
  return new Elysia()
    // OpenAPI documentation with Scalar UI
    .use(
      openapi({
        documentation: {
          info: {
            title: 'OpenComposer PTY Server API',
            version: '0.1.0',
            description: 'PTY-as-a-Service with instant recovery (Elysia + Bun)',
          },
          tags: [
            { name: 'PTY', description: 'PTY session management' },
            { name: 'Health', description: 'Health check endpoints' },
          ],
        },
      }),
    )

    // CORS middleware
    .use(
      cors({
        origin: '*', // TODO: Configure allowed origins
        credentials: true,
      }),
    )

    // Mount PTY routes
    .use(ptyRoutes)

    // Health check
    .get('/health', () => ({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      runtime: 'bun',
      framework: 'elysia',
    }))

    // Root endpoint
    .get('/', () => ({
      name: '@open-composer/server',
      version: '0.1.0',
      description: 'PTY-as-a-Service with instant recovery (Elysia + Bun)',
      runtime: 'bun',
      framework: 'elysia',
      documentation: {
        openapi: '/openapi',
        json: '/openapi/json',
      },
      endpoints: {
        'POST /session/:sid/pty': 'Create new PTY',
        'GET /session/:sid/pty': 'List PTYs for session',
        'GET /session/:sid/pty/:id/stream': 'Stream PTY output (SSE)',
        'POST /session/:sid/pty/:id/input': 'Write input to PTY',
        'POST /session/:sid/pty/:id/resize': 'Resize PTY',
        'GET /session/:sid/pty/:id/snapshot': 'Get PTY snapshot',
        'DELETE /session/:sid/pty/:id': 'Kill PTY',
        'DELETE /session/:sid/pty': 'Kill all session PTYs',
        'GET /health': 'Health check',
      },
    }))

    // Error handler
    .onError(({ code, error, set }) => {
      console.error('Server error:', error)
      set.status = code === 'NOT_FOUND' ? 404 : 500
      return {
        error: error instanceof Error ? error.message : String(error),
        stack:
          process.env.NODE_ENV === 'development' && error instanceof Error
            ? error.stack
            : undefined,
      }
    })
}

/**
 * Start the server with the given options
 */
export function startServer(options: ServerOptions = {}) {
  const {
    port = 3000,
    cleanupInterval = 5 * 60 * 1000, // 5 minutes
    maxIdleTime = 30 * 60 * 1000, // 30 minutes
  } = options

  const app = createApp()

  // Start server
  app.listen(port)

  console.log(`🚀 OpenComposer Server (Elysia + Bun) starting on port ${port}...`)
  console.log(`✅ Server running at http://localhost:${port}`)
  console.log(`📡 PTY endpoints available under /session/:sid/pty`)
  console.log(`🦊 Using Bun-native subprocess (no node-pty dependency)`)

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n🛑 Shutting down gracefully...')
    console.log('Cleaning up PTY sessions...')
    app.stop()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  // Periodic idle cleanup
  const cleanupTimer = setInterval(() => {
    const cleaned = ptyService.cleanupIdle(maxIdleTime)
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} idle PTY session(s)`)
    }
  }, cleanupInterval)

  // Clean up timer on shutdown
  process.on('beforeExit', () => {
    clearInterval(cleanupTimer)
  })

  return app
}
