/**
 * OpenComposer Server - PTY-as-a-Service (Elysia + Bun)
 *
 * Exported server creation and startup functions for programmatic use
 */

import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { openapi } from '@elysiajs/openapi'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Context from 'effect/Context'
import * as Console from 'effect/Console'
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

// -----------------------------------------------------------------------------
// Effect TS Wrapper Types and Services
// -----------------------------------------------------------------------------

/**
 * Server configuration error types
 */
export class ServerConfigError {
  readonly _tag = 'ServerConfigError'
  constructor(readonly message: string) {}
}

export class ServerStartError {
  readonly _tag = 'ServerStartError'
  constructor(readonly message: string, readonly cause?: unknown) {}
}

/**
 * Server instance type
 */
export interface ServerInstanceType {
  readonly app: ReturnType<typeof createApp>
  readonly port: number
  readonly cleanup: () => void
}

/**
 * Server instance context
 */
export class ServerInstance extends Context.Tag('ServerInstance')<
  ServerInstance,
  ServerInstanceType
>() {}

/**
 * Effect-wrapped server creation
 * Returns an Effect that creates the Elysia app
 */
export function createAppEffect(): Effect.Effect<ReturnType<typeof createApp>, ServerConfigError> {
  return Effect.try({
    try: () => createApp(),
    catch: (error) =>
      new ServerConfigError(
        `Failed to create server app: ${error instanceof Error ? error.message : String(error)}`,
      ),
  })
}

/**
 * Effect-wrapped server startup
 * Returns an Effect that starts the server and provides cleanup
 */
export function startServerEffect(
  options: ServerOptions = {},
): Effect.Effect<ServerInstanceType, ServerStartError | ServerConfigError> {
  return Effect.gen(function* () {
    const {
      port = 3000,
      cleanupInterval = 5 * 60 * 1000,
      maxIdleTime = 30 * 60 * 1000,
    } = options

    // Validate port
    if (port < 0 || port > 65535) {
      return yield* Effect.fail(
        new ServerConfigError(`Invalid port: ${port}. Must be between 0 and 65535.`),
      )
    }

    // Create app
    const app = yield* createAppEffect()

    // Start server
    const started = yield* Effect.try({
      try: () => {
        app.listen(port)
        return true
      },
      catch: (error) =>
        new ServerStartError(
          `Failed to start server on port ${port}`,
          error,
        ),
    })

    if (!started) {
      return yield* Effect.fail(new ServerStartError('Server failed to start'))
    }

    // Log startup messages using Effect Console
    yield* Console.log(`🚀 OpenComposer Server (Elysia + Bun) starting on port ${port}...`)
    yield* Console.log(`✅ Server running at http://localhost:${port}`)
    yield* Console.log(`📡 PTY endpoints available under /session/:sid/pty`)
    yield* Console.log(`🦊 Using Bun-native subprocess (no node-pty dependency)`)

    // Setup cleanup timer
    const cleanupTimer = setInterval(() => {
      const cleaned = ptyService.cleanupIdle(maxIdleTime)
      if (cleaned > 0) {
        Effect.runSync(Console.log(`🧹 Cleaned up ${cleaned} idle PTY session(s)`))
      }
    }, cleanupInterval)

    // Setup shutdown handlers
    const shutdown = () => {
      Effect.runSync(Console.log('\n🛑 Shutting down gracefully...'))
      Effect.runSync(Console.log('Cleaning up PTY sessions...'))
      clearInterval(cleanupTimer)
      app.stop()
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
    process.on('beforeExit', () => {
      clearInterval(cleanupTimer)
    })

    // Return server instance with cleanup
    const cleanup = () => {
      clearInterval(cleanupTimer)
      app.stop()
      process.off('SIGINT', shutdown)
      process.off('SIGTERM', shutdown)
    }

    return {
      app,
      port,
      cleanup,
    }
  })
}

/**
 * Create a Layer that provides ServerInstance
 */
export const ServerInstanceLive = (options: ServerOptions = {}): Layer.Layer<ServerInstance, ServerStartError | ServerConfigError> =>
  Layer.effect(
    ServerInstance,
    startServerEffect(options),
  )
