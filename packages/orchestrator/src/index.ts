/**
 * @open-composer/orchestrator
 *
 * Core orchestration package following Open SWE patterns with LLM task
 * management and state handling. Provides master coordination using
 * OpenRouter API with proper token tracking and caching.
 *
 * Built with Effect-ts for functional error handling and dependency injection.
 *
 * @example Effect-based API (recommended)
 * ```typescript
 * import * as Effect from 'effect/Effect';
 * import { makeOrchestratorService, planProject } from '@open-composer/orchestrator';
 *
 * const service = makeOrchestratorService({
 *   openRouterApiKey: process.env.OPENROUTER_API_KEY,
 * });
 *
 * const program = service.planProject({
 *   objective: "Build a new feature",
 *   description: "Implement user authentication",
 * });
 *
 * const plan = await Effect.runPromise(program);
 * ```
 *
 * @example Legacy class-based API
 * ```typescript
 * import { ProfessorOakOrchestrator } from '@open-composer/orchestrator';
 *
 * const orchestrator = new ProfessorOakOrchestrator({
 *   openRouterApiKey: process.env.OPENROUTER_API_KEY,
 * });
 *
 * const plan = await orchestrator.planProject({
 *   objective: "Build a new feature",
 *   description: "Implement user authentication",
 * });
 * ```
 */

// Error types
export {
  makeAPIError,
  makeConfigError,
  makeValidationError,
  type OrchestratorAPIError,
  type OrchestratorConfigError,
  type OrchestratorError,
  type OrchestratorValidationError,
} from "./errors.js";
// LLM task types
export {
  getTaskConfigKey,
  LLMTask,
  TASK_TO_CONFIG_DEFAULTS_MAP,
} from "./llm-task.js";

// Legacy class-based orchestrator (for backwards compatibility)
export { ProfessorOakOrchestrator } from "./orchestrator.js";
// Effect-based service (recommended)
export {
  coordinateAgents,
  decomposeTask,
  makeOrchestratorService,
  OrchestratorService,
  type OrchestratorService as IOrchestratorService,
  optimizeResourceAllocation,
  planProject,
  synthesizeResults,
} from "./service.js";
// State management
export {
  type GraphConfig,
  GraphConfigSchema,
  type OrchestratorState,
  OrchestratorStateAnnotation,
  tokenDataReducer,
} from "./state.js";

// Type definitions
export type {
  Agent,
  AgentResult,
  CoordinationPlan,
  ModelTokenData,
  ProjectRequirements,
  ResourcePlan,
  SubTask,
  SynthesizedResult,
  Task,
  TaskPlan,
} from "./types.js";
