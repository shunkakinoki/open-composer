#!/usr/bin/env bun
/**
 * OpenComposer Server - PTY-as-a-Service (Bun-native)
 *
 * Server-first terminal session manager with persistent snapshots
 * and instant recovery over HTTP/SSE using Bun's native subprocess.
 *
 * Usage:
 *   bun run src/index-bun.ts [--port 3000]
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { ptyRoutes } from './routes/pty.js'
import { ptyService } from './services/pty-service.js'

// Parse CLI args
const args = process.argv.slice(2)
const portIndex = args.indexOf('--port')
const port = portIndex !== -1 ? Number.parseInt(args[portIndex + 1], 10) : 3000

// Create Hono app
const app = new Hono()

// Middleware
app.use('*', logger())
app.use(
  '*',
  cors({
    origin: '*', // TODO: Configure allowed origins
    credentials: true,
  }),
)

// Mount PTY routes
app.route('/', ptyRoutes)

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    runtime: 'bun',
  })
})

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: '@open-composer/server',
    version: '0.1.0',
    description: 'PTY-as-a-Service with instant recovery (Bun-native)',
    runtime: 'bun',
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
  })
})

// Error handler
app.onError((err, c) => {
  console.error('Server error:', err)
  return c.json(
    {
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    },
    500,
  )
})

// Start server
console.log(`🚀 OpenComposer Server (Bun-native) starting on port ${port}...`)

const server = Bun.serve({
  port,
  fetch: app.fetch,
})

console.log(`✅ Server running at http://localhost:${server.port}`)
console.log(`📡 PTY endpoints available under /session/:sid/pty`)
console.log(`🦊 Using Bun-native subprocess (no node-pty dependency)`)

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...')

  // Kill all PTYs
  console.log('Cleaning up PTY sessions...')
  // ptyService doesn't expose a killAll method, so we'd need to add that
  // For now, the process exit will clean up

  server.stop()
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down...')
  server.stop()
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
