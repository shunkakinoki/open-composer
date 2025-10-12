/**
 * E2E Tests - Effect TS Server Functions
 */

import { describe, test, expect, afterEach } from 'bun:test'
import * as Effect from 'effect/Effect'
import {
  createAppEffect,
  startServerEffect,
  ServerInstance,
  ServerConfigError,
  ServerStartError,
  type ServerOptions,
} from '../src/server.js'

describe('Effect TS Server Functions', () => {
  const cleanups: Array<() => void> = []

  afterEach(() => {
    // Clean up any running servers
    for (const cleanup of cleanups) {
      cleanup()
    }
    cleanups.length = 0
  })

  describe('createAppEffect', () => {
    test('should successfully create an Elysia app', async () => {
      const program = createAppEffect()

      const result = await Effect.runPromise(program)

      expect(result).toBeDefined()
      expect(typeof result.listen).toBe('function')
      expect(typeof result.stop).toBe('function')
    })

    test('should return the same app structure as createApp', async () => {
      const program = createAppEffect()

      const app = await Effect.runPromise(program)

      // Test that basic endpoints are available by checking the app can fetch
      expect(app.fetch).toBeDefined()
    })
  })

  describe('startServerEffect', () => {
    test('should successfully start server with default options', async () => {
      const program = startServerEffect()

      const result = await Effect.runPromise(program)

      expect(result).toBeDefined()
      expect(result.app).toBeDefined()
      expect(result.port).toBe(3000)
      expect(typeof result.cleanup).toBe('function')

      cleanups.push(result.cleanup)
    })

    test('should start server with custom port', async () => {
      const customPort = 4567
      const program = startServerEffect({ port: customPort })

      const result = await Effect.runPromise(program)

      expect(result.port).toBe(customPort)
      expect(result.app).toBeDefined()

      // Verify server is actually listening on the custom port
      const response = await fetch(`http://localhost:${customPort}/health`)
      expect(response.ok).toBe(true)

      cleanups.push(result.cleanup)
    })

    test('should start server with custom cleanup intervals', async () => {
      const options: ServerOptions = {
        port: 4568,
        cleanupInterval: 1000,
        maxIdleTime: 5000,
      }
      const program = startServerEffect(options)

      const result = await Effect.runPromise(program)

      expect(result.port).toBe(options.port)
      expect(result.app).toBeDefined()

      cleanups.push(result.cleanup)
    })

    test('should fail with invalid port (negative)', async () => {
      const program = startServerEffect({ port: -1 })

      try {
        await Effect.runPromise(program)
        expect(false).toBe(true) // Should not reach here
      } catch (error) {
        expect(error).toBeDefined()
        // Effect wraps errors - check the error content
        expect(String(error)).toContain('Invalid port')
      }
    })

    test('should fail with invalid port (too large)', async () => {
      const program = startServerEffect({ port: 99999 })

      try {
        await Effect.runPromise(program)
        expect(false).toBe(true) // Should not reach here
      } catch (error) {
        expect(error).toBeDefined()
        // Effect wraps errors - check the error content
        expect(String(error)).toContain('Invalid port')
      }
    })

    test('should handle server cleanup properly', async () => {
      const program = startServerEffect({ port: 4569 })

      const result = await Effect.runPromise(program)

      expect(result.cleanup).toBeDefined()

      // Call cleanup
      result.cleanup()

      // After cleanup, server should not be accessible
      await Bun.sleep(100)

      try {
        await fetch(`http://localhost:${result.port}/health`, {
          signal: AbortSignal.timeout(1000),
        })
        // If we reach here, the server is still running
        expect(false).toBe(true) // This should not happen
      } catch (error) {
        // Expected - server should be stopped
        expect(error).toBeDefined()
      }
    })
  })

  describe('ServerInstance Context', () => {
    test('should provide ServerInstance via Effect.provide', async () => {
      const program = Effect.gen(function* () {
        const instance = yield* ServerInstance
        return instance
      })

      const layer = Effect.gen(function* () {
        const instance = yield* startServerEffect({ port: 4570 })
        return instance
      }).pipe(Effect.map((instance) => ServerInstance.of(instance)))

      const result = await Effect.runPromise(
        program.pipe(Effect.provideService(ServerInstance, await Effect.runPromise(layer))),
      )

      expect(result.app).toBeDefined()
      expect(result.port).toBe(4570)
      expect(result.cleanup).toBeDefined()

      cleanups.push(result.cleanup)
    })
  })

  describe('Error Types', () => {
    test('ServerConfigError should have correct structure', () => {
      const error = new ServerConfigError('Test error message')

      expect(error._tag).toBe('ServerConfigError')
      expect(error.message).toBe('Test error message')
    })

    test('ServerStartError should have correct structure', () => {
      const cause = new Error('Underlying cause')
      const error = new ServerStartError('Test start error', cause)

      expect(error._tag).toBe('ServerStartError')
      expect(error.message).toBe('Test start error')
      expect(error.cause).toBe(cause)
    })

    test('ServerStartError should work without cause', () => {
      const error = new ServerStartError('Test start error')

      expect(error._tag).toBe('ServerStartError')
      expect(error.message).toBe('Test start error')
      expect(error.cause).toBeUndefined()
    })
  })

  describe('Integration Tests', () => {
    test('should start server and handle requests', async () => {
      const program = startServerEffect({ port: 4571 })

      const result = await Effect.runPromise(program)

      // Test health endpoint
      const healthResponse = await fetch(`http://localhost:${result.port}/health`)
      expect(healthResponse.ok).toBe(true)

      const healthData = await healthResponse.json()
      expect(healthData.status).toBe('ok')

      // Test root endpoint
      const rootResponse = await fetch(`http://localhost:${result.port}/`)
      expect(rootResponse.ok).toBe(true)

      const rootData = await rootResponse.json()
      expect(rootData.name).toBe('@open-composer/server')

      cleanups.push(result.cleanup)
    })

    test('should handle multiple concurrent requests', async () => {
      const program = startServerEffect({ port: 4572 })

      const result = await Effect.runPromise(program)

      const requests = Array.from({ length: 20 }, () =>
        fetch(`http://localhost:${result.port}/health`),
      )

      const responses = await Promise.all(requests)

      responses.forEach((response) => {
        expect(response.ok).toBe(true)
      })

      cleanups.push(result.cleanup)
    })

    test('should be able to start multiple servers on different ports', async () => {
      const server1Program = startServerEffect({ port: 4573 })
      const server2Program = startServerEffect({ port: 4574 })

      const [server1, server2] = await Promise.all([
        Effect.runPromise(server1Program),
        Effect.runPromise(server2Program),
      ])

      expect(server1.port).toBe(4573)
      expect(server2.port).toBe(4574)

      // Verify both are accessible
      const [response1, response2] = await Promise.all([
        fetch(`http://localhost:${server1.port}/health`),
        fetch(`http://localhost:${server2.port}/health`),
      ])

      expect(response1.ok).toBe(true)
      expect(response2.ok).toBe(true)

      cleanups.push(server1.cleanup, server2.cleanup)
    })
  })
})
