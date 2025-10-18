/**
 * Dynamic PTY implementation detection
 * Based on Google Gemini CLI approach
 */

import { Effect } from 'effect';

export interface PtyModule {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  module: any;
  name: 'bun-pty-rust' | 'lydell-node-pty' | 'node-pty';
}

export type PtyImplementation = PtyModule | null;

/**
 * Error type for PTY loading failures
 */
export class PtyLoadError {
  readonly _tag = 'PtyLoadError';
  constructor(readonly message: string) {}
}

/**
 * Attempts to load a specific PTY module
 */
const tryLoadPty = (moduleName: string, name: PtyModule['name']): Effect.Effect<PtyModule, PtyLoadError> =>
  Effect.tryPromise({
    try: async () => {
      const module = await import(moduleName);
      return { module, name };
    },
    catch: (error) => new PtyLoadError(`Failed to load ${moduleName}: ${error}`),
  });

/**
 * Attempts to load a PTY implementation using Effect
 * Tries bun-pty first (built for Bun), then @lydell/node-pty, then node-pty, then returns null
 */
export const getPtyEffect = (): Effect.Effect<PtyImplementation, never> =>
  tryLoadPty('bun-pty-rust', 'bun-pty-rust')
    .pipe(
      Effect.catchAll(() => tryLoadPty('@lydell/node-pty', 'lydell-node-pty')),
      Effect.catchAll(() => tryLoadPty('node-pty', 'node-pty')),
      Effect.catchAll(() => Effect.succeed(null as PtyImplementation)),
    );

/**
 * Legacy promise-based API for backward compatibility
 * Attempts to load a PTY implementation
 * Tries bun-pty first (built for Bun), then @lydell/node-pty, then node-pty, then returns null
 */
export const getPty = async (): Promise<PtyImplementation> =>
  Effect.runPromise(getPtyEffect());
