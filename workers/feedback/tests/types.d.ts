import "@cloudflare/workers-types";

export function createExecutionContext(): ExecutionContext;
export function waitOnExecutionContext(ctx: ExecutionContext): Promise<void>;
