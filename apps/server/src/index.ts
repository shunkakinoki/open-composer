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

import { startServer } from './server.js'

// Parse CLI args
const args = process.argv.slice(2)
const portIndex = args.indexOf('--port')
const port = portIndex !== -1 ? Number.parseInt(args[portIndex + 1], 10) : 3000

// Start the server
const app = startServer({ port })

export default app
export { startServer }