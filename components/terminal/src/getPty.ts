/**
 * Dynamic PTY implementation detection
 * Based on Google Gemini CLI approach
 */

export type PtyImplementation = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  module: any;
  name: 'bun-pty-rust' | 'lydell-node-pty' | 'node-pty';
} | null;

/**
 * Attempts to load a PTY implementation
 * Tries bun-pty first (built for Bun), then @lydell/node-pty, then node-pty, then returns null
 */
export const getPty = async (): Promise<PtyImplementation> => {
  try {
    const bunPty = 'bun-pty-rust';
    const module = await import(bunPty);
    return { module, name: 'bun-pty-rust' };
  } catch (_e) {
    try {
      const lydell = '@lydell/node-pty';
      const module = await import(lydell);
      return { module, name: 'lydell-node-pty' };
    } catch (_e2) {
      try {
        const nodePty = 'node-pty';
        const module = await import(nodePty);
        return { module, name: 'node-pty' };
      } catch (_e3) {
        return null;
      }
    }
  }
};
