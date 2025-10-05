/**
 * @open-composer/agent-registry
 *
 * Pokemon-style agent management for OpenComposer,
 * following open-swe patterns for model configuration and provider systems.
 */

// Core types
export { LLMTask } from "./types.js";
export type {
  Provider,
  AgentTier,
  AgentStats,
  PokemonAttributes,
  ModelCompatibility,
  OpenComposerAgent,
  AgentTeam,
  SquadConfig,
} from "./types.js";

export {
  AgentStatsSchema,
  PokemonAttributesSchema,
  ModelCompatibilitySchema,
  OpenComposerAgentSchema,
  AgentTeamSchema,
  SquadConfigSchema,
  PROVIDER_FALLBACK_ORDER,
} from "./types.js";

// Agent Factory
export { AgentFactory } from "./agent-factory.js";

// Agent Registry
export {
  AgentRegistry,
  getAgentRegistry,
  resetAgentRegistry,
} from "./registry.js";

// Squad Launcher
export {
  SquadLauncher,
  getSquadLauncher,
  resetSquadLauncher,
} from "./squad-launcher.js";
export type {
  TaskAssignmentStrategy,
  SquadExecutionContext,
  SquadExecutionResult,
} from "./squad-launcher.js";

// UI Components
export { PokemonUI } from "./ui/pokemon-ui.js";
export { SquadSelector, startSquadSelector } from "./ui/squad-selector.js";

// Default exports for convenience
export {
  getAgentRegistry as default,
} from "./registry.js";
