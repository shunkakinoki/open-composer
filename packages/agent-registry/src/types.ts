import { z } from "zod";

/**
 * LLM Task enum from open-swe
 */
export enum LLMTask {
  PLANNER = "planner",
  PROGRAMMER = "programmer",
  ROUTER = "router",
  REVIEWER = "reviewer",
  SUMMARIZER = "summarizer",
}

/**
 * Provider types from open-swe
 */
export const PROVIDER_FALLBACK_ORDER = [
  "openai",
  "anthropic",
  "google-genai",
] as const;

export type Provider = (typeof PROVIDER_FALLBACK_ORDER)[number];

/**
 * Agent tier system (Pokemon-style evolution)
 */
export type AgentTier = "starter" | "evolved" | "legendary";

/**
 * Pokemon-style agent stats
 */
export const AgentStatsSchema = z.object({
  speed: z.number().min(0).max(100),
  accuracy: z.number().min(0).max(100),
  power: z.number().min(0).max(100),
  efficiency: z.number().min(0).max(100),
  versatility: z.number().min(0).max(100),
});

export type AgentStats = z.infer<typeof AgentStatsSchema>;

/**
 * Pokemon attributes for agents
 */
export const PokemonAttributesSchema = z.object({
  sprite: z.string(),
  stats: AgentStatsSchema,
  type: z.string(),
  evolvesFrom: z.string().optional(),
  evolvesTo: z.string().optional(),
});

export type PokemonAttributes = z.infer<typeof PokemonAttributesSchema>;

/**
 * Model compatibility configuration
 */
export const ModelCompatibilitySchema = z.object({
  supportedTasks: z.array(z.nativeEnum(LLMTask)),
  maxTokens: z.number().optional(),
  supportsStreaming: z.boolean().default(true),
  supportsThinking: z.boolean().default(false),
});

export type ModelCompatibility = z.infer<typeof ModelCompatibilitySchema>;

/**
 * OpenComposer Agent schema
 */
export const OpenComposerAgentSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  modelName: z.string(),
  provider: z.enum(PROVIDER_FALLBACK_ORDER),
  tier: z.enum(["starter", "evolved", "legendary"]),
  taskSpecializations: z.array(z.nativeEnum(LLMTask)),
  pokemonAttributes: PokemonAttributesSchema,
  compatibility: ModelCompatibilitySchema,
  description: z.string(),
  createdAt: z.date(),
  performance: z
    .object({
      totalTokensUsed: z.number().default(0),
      totalRequests: z.number().default(0),
      successRate: z.number().min(0).max(100).default(0),
      averageLatency: z.number().default(0),
    })
    .default({
      totalTokensUsed: 0,
      totalRequests: 0,
      successRate: 0,
      averageLatency: 0,
    }),
});

export type OpenComposerAgent = z.infer<typeof OpenComposerAgentSchema>;

/**
 * Agent Team composition
 */
export const AgentTeamSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  agents: z.array(OpenComposerAgentSchema),
  createdAt: z.date(),
  config: z
    .object({
      maxConcurrent: z.number().default(3),
      fallbackEnabled: z.boolean().default(true),
      taskDistribution: z.enum(["round-robin", "specialized", "balanced"]).default("specialized"),
    })
    .optional(),
});

export type AgentTeam = z.infer<typeof AgentTeamSchema>;

/**
 * Squad configuration for custom agent squads
 */
export const SquadConfigSchema = z.object({
  name: z.string(),
  description: z.string(),
  agentIds: z.array(z.string().uuid()),
  taskDistribution: z.enum(["round-robin", "specialized", "balanced"]).default("specialized"),
  maxConcurrent: z.number().min(1).max(10).default(3),
  fallbackEnabled: z.boolean().default(true),
});

export type SquadConfig = z.infer<typeof SquadConfigSchema>;
