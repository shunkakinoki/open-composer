export interface Env {
  POSTHOG_HOST: string;
  POSTHOG_PROJECT_API_KEY: string;
  RATE_LIMITER: DurableObjectNamespace;
}

export function createExecutionContext(): ExecutionContext;
export function waitOnExecutionContext(ctx: ExecutionContext): Promise<void>;
