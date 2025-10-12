/**
 * PTY Service - Bun-native persistent terminal sessions
 *
 * Uses Bun's native Subprocess with stdio='overlapped' for PTY-like behavior
 * Each PTY is mirrored into a headless terminal with serialization support.
 */

import { Terminal } from '@xterm/headless'
import { SerializeAddon } from '@xterm/addon-serialize'
import type { Subprocess } from 'bun'
import type {
  CreatePTYRequest,
  CreatePTYResponse,
  PTYInputRequest,
  PTYResizeRequest,
  PTYSnapshotResponse,
} from '../types/pty.js'

interface PTYHandle {
  /** Bun subprocess */
  proc: Subprocess
  /** Headless xterm terminal for scrollback and rendering */
  term: Terminal
  /** Serialize addon for snapshot/restore */
  ser: SerializeAddon
  /** Creation timestamp */
  createdAt: Date
  /** Last activity timestamp */
  lastActivity: Date
  /** Reader for stdout */
  reader: ReadableStreamDefaultReader<Uint8Array> | null
  /** Writer for stdin (unused, we write directly to proc.stdin) */
  writer: null
}

/**
 * PTY Service manages all PTY sessions across all user sessions
 */
class PTYService {
  /** Map of ptyID -> PTYHandle */
  private ptys: Map<string, PTYHandle> = new Map()

  /** Map of sessionID -> Set<ptyID> for session-scoped cleanup */
  private sessionPTYs: Map<string, Set<string>> = new Map()

  /**
   * Create a new PTY session using Bun's subprocess
   */
  create(sessionID: string, req: CreatePTYRequest): CreatePTYResponse {
    const { cmd, cwd, env, cols, rows } = req

    // Create headless xterm terminal
    const term = new Terminal({
      cols,
      rows,
      scrollback: 5000,
      allowProposedApi: true,
    })

    // Attach serialization addon
    const ser = new SerializeAddon()
    term.loadAddon(ser)

    // Spawn subprocess with Bun
    const shell = cmd[0]
    const args = cmd.slice(1)

    const proc = Bun.spawn([shell, ...args], {
      cwd: cwd || process.env.HOME || process.cwd(),
      env: {
        ...process.env,
        ...env,
        TERM: 'xterm-256color',
      },
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
    })

    // Generate unique PTY ID
    const ptyID = crypto.randomUUID()

    // Get reader for stdout
    const reader = proc.stdout.getReader()

    // Stdin is a FileSink, we'll write directly to it
    const writer = null // We'll use proc.stdin directly

    // Wire PTY output to headless terminal
    this.pipeOutput(reader, term)

    // Create handle
    const handle: PTYHandle = {
      proc,
      term,
      ser,
      createdAt: new Date(),
      lastActivity: new Date(),
      reader,
      writer,
    }

    // Store handle
    this.ptys.set(ptyID, handle)

    // Track session -> PTY mapping
    if (!this.sessionPTYs.has(sessionID)) {
      this.sessionPTYs.set(sessionID, new Set())
    }
    this.sessionPTYs.get(sessionID)!.add(ptyID)

    return { ptyID }
  }

  /**
   * Pipe subprocess output to terminal
   */
  private async pipeOutput(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    term: Terminal,
  ): Promise<void> {
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        // Convert Uint8Array to string and write to terminal
        const text = new TextDecoder().decode(value)
        term.write(text)
      }
    } catch (error) {
      // Stream closed or errored
      console.error('PTY output pipe error:', error)
    }
  }

  /**
   * Write input to a PTY
   */
  async writeInput(ptyID: string, req: PTYInputRequest): Promise<boolean> {
    const handle = this.ptys.get(ptyID)
    if (!handle) return false

    try {
      // Write to stdin using Bun's FileSink
      const stdin = handle.proc.stdin
      if (typeof stdin !== 'number' && stdin && 'write' in stdin) {
        // stdin is a FileSink
        stdin.write(req.data)
      } else {
        return false
      }
      handle.lastActivity = new Date()
      return true
    } catch (error) {
      console.error('PTY write error:', error)
      return false
    }
  }

  /**
   * Resize a PTY (note: Bun subprocess doesn't support resize natively)
   */
  resize(ptyID: string, req: PTYResizeRequest): boolean {
    const handle = this.ptys.get(ptyID)
    if (!handle) return false

    const { cols, rows } = req
    handle.term.resize(cols, rows)
    handle.lastActivity = new Date()

    // Note: We can't resize the actual subprocess, but the terminal buffer is resized
    // This is a limitation of using Bun.spawn without full PTY support
    return true
  }

  /**
   * Get a serialized snapshot of the terminal state
   */
  getSnapshot(ptyID: string): PTYSnapshotResponse | null {
    const handle = this.ptys.get(ptyID)
    if (!handle) return null

    return {
      data: handle.ser.serialize(),
    }
  }

  /**
   * Get a PTY handle (for streaming)
   */
  getHandle(ptyID: string): PTYHandle | null {
    return this.ptys.get(ptyID) || null
  }

  /**
   * Kill a PTY and clean up resources
   */
  kill(ptyID: string): boolean {
    const handle = this.ptys.get(ptyID)
    if (!handle) return false

    // Kill subprocess
    handle.proc.kill()

    // Close streams - catch errors as stream may already be closed
    if (handle.reader) {
      try {
        handle.reader.cancel()
        handle.reader.releaseLock()
      } catch (err) {
        // Stream already cancelled or closed, ignore
      }
    }
    // stdin is a FileSink, no need to close

    this.ptys.delete(ptyID)

    // Remove from session mapping
    for (const [, ptySet] of this.sessionPTYs) {
      ptySet.delete(ptyID)
    }

    return true
  }

  /**
   * Kill all PTYs for a session
   */
  killSession(sessionID: string): void {
    const ptyIDs = this.sessionPTYs.get(sessionID)
    if (!ptyIDs) return

    for (const ptyID of ptyIDs) {
      this.kill(ptyID)
    }

    this.sessionPTYs.delete(sessionID)
  }

  /**
   * List all PTYs for a session
   */
  listPTYs(sessionID: string): string[] {
    const ptyIDs = this.sessionPTYs.get(sessionID)
    return ptyIDs ? Array.from(ptyIDs) : []
  }

  /**
   * Cleanup idle PTYs (for background maintenance)
   */
  cleanupIdle(maxIdleMs: number): number {
    const now = Date.now()
    let cleaned = 0

    for (const [ptyID, handle] of this.ptys) {
      const idleMs = now - handle.lastActivity.getTime()
      if (idleMs > maxIdleMs) {
        this.kill(ptyID)
        cleaned++
      }
    }

    return cleaned
  }
}

/**
 * Global PTY service instance
 */
export const ptyService = new PTYService()
