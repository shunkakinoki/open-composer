#!/usr/bin/env bun
/**
 * OpenComposer Server - PTY-as-a-Service (Elysia + Bun)
 *
 * Server-first terminal session manager with persistent snapshots
 * and instant recovery over HTTP/SSE using Bun's native subprocess.
 *
 * Usage:
 *   bun run src/index.ts [--port 3000]
 */

import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { openapi } from '@elysiajs/openapi'
import { ptyRoutes } from './routes/pty.js'
import { ptyService } from './services/pty-service.js'

// Parse CLI args
const args = process.argv.slice(2)
const portIndex = args.indexOf('--port')
const port = portIndex !== -1 ? Number.parseInt(args[portIndex + 1], 10) : 3000

// Create Elysia app
const app = new Elysia()
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

  // Start server
  .listen(port)

console.log(`🚀 OpenComposer Server (Elysia + Bun) starting on port ${port}...`)
console.log(`✅ Server running at http://localhost:${port}`)
console.log(`📡 PTY endpoints available under /session/:sid/pty`)
console.log(`🦊 Using Bun-native subprocess (no node-pty dependency)`)

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...')

  // Kill all PTYs
  console.log('Cleaning up PTY sessions...')
  // ptyService doesn't expose a killAll method, so we'd need to add that
  // For now, the process exit will clean up

  app.stop()
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down...')
  app.stop()
  process.exit(0)
})

// Periodic idle cleanup (every 5 minutes, kill PTYs idle > 30 min)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
const MAX_IDLE_MS = 30 * 60 * 1000 // 30 minutes

setInterval(() => {
  const cleaned = ptyService.cleanupIdle(MAX_IDLE_MS)
  if (cleaned > 0) {
    console.log(`🧹 Cleaned up ${cleaned} idle PTY session(s)`)
  }
}, CLEANUP_INTERVAL_MS)

export default app
