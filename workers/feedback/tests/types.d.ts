import "@cloudflare/workers-types";

export interface Env {
  FEEDBACK_KV: KVNamespace;
}

export function createExecutionContext(): ExecutionContext;
export function waitOnExecutionContext(ctx: ExecutionContext): Promise<void>;
