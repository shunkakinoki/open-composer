declare module "cloudflare:test" {
  interface ProvidedEnv {
    POSTHOG_HOST: string;
    POSTHOG_PROJECT_API_KEY: string;
    RATE_LIMITER: DurableObjectNamespace;
  }

  export interface Env extends ProvidedEnv {}

  export function createExecutionContext(): ExecutionContext;
  export function waitOnExecutionContext(ctx: ExecutionContext): Promise<void>;
  export const env: Env;
}
