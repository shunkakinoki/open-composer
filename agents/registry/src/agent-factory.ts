import { v4 as uuidv4 } from "uuid";
import {
  LLMTask,
  type AgentStats,
  type OpenComposerAgent,
  type PokemonAttributes,
  type Provider,
} from "./types.js";

/**
 * Default Pokemon sprites mapped to providers
 */
const PROVIDER_SPRITES: Record<Provider, string> = {
  anthropic: "🤖", // Claude
  openai: "🧠", // GPT
  "google-genai": "💎", // Gemini
};

/**
 * Calculate agent stats based on model characteristics
 */
function calculateAgentStats(
  modelName: string,
  provider: Provider,
): AgentStats {
  // Base stats
  let speed = 50;
  let accuracy = 50;
  let power = 50;
  let efficiency = 50;
  let versatility = 50;

  // Provider-based adjustments
  if (provider === "anthropic") {
    accuracy += 20;
    power += 15;
  } else if (provider === "openai") {
    versatility += 20;
    speed += 10;
  } else if (provider === "google-genai") {
    speed += 25;
    efficiency += 15;
  }

  // Model tier-based adjustments
  if (modelName.includes("haiku") || modelName.includes("nano")) {
    speed += 20;
    efficiency += 15;
    power -= 10;
  } else if (
    modelName.includes("sonnet") ||
    modelName.includes("gpt-5") ||
    modelName.includes("gemini-2.5-pro")
  ) {
    power += 20;
    accuracy += 15;
    speed -= 5;
  } else if (
    modelName.includes("opus") ||
    modelName.includes("o1") ||
    modelName.includes("extended-thinking")
  ) {
    power += 30;
    accuracy += 25;
    speed -= 15;
  }

  // Normalize stats to 0-100 range
  const normalize = (val: number) => Math.max(0, Math.min(100, val));

  return {
    speed: normalize(speed),
    accuracy: normalize(accuracy),
    power: normalize(power),
    efficiency: normalize(efficiency),
    versatility: normalize(versatility),
  };
}

/**
 * Determine agent tier based on model name
 */
function determineAgentTier(
  modelName: string,
): "starter" | "evolved" | "legendary" {
  if (
    modelName.includes("haiku") ||
    modelName.includes("nano") ||
    modelName.includes("mini")
  ) {
    return "starter";
  }

  if (
    modelName.includes("opus") ||
    modelName.includes("o1") ||
    modelName.includes("extended-thinking")
  ) {
    return "legendary";
  }

  return "evolved";
}

/**
 * Determine Pokemon type based on task specializations
 */
function determinePokemonType(tasks: LLMTask[]): string {
  const typeMap: Record<LLMTask, string> = {
    [LLMTask.PLANNER]: "🧭 Strategic",
    [LLMTask.PROGRAMMER]: "⚡ Electric",
    [LLMTask.REVIEWER]: "🔍 Psychic",
    [LLMTask.ROUTER]: "🌊 Water",
    [LLMTask.SUMMARIZER]: "🌿 Grass",
  };

  if (tasks.length === 1) {
    return typeMap[tasks[0]];
  }

  return "🌟 Normal"; // Multi-type
}

/**
 * Create Pokemon attributes for an agent
 */
function createPokemonAttributes(
  modelName: string,
  provider: Provider,
  tasks: LLMTask[],
): PokemonAttributes {
  const stats = calculateAgentStats(modelName, provider);
  const type = determinePokemonType(tasks);

  // Evolution chain mapping
  let evolvesFrom: string | undefined;
  let evolvesTo: string | undefined;

  if (modelName.includes("haiku")) {
    evolvesTo = "claude-sonnet";
  } else if (modelName.includes("sonnet")) {
    evolvesFrom = "claude-haiku";
    evolvesTo = "claude-opus";
  } else if (modelName.includes("opus")) {
    evolvesFrom = "claude-sonnet";
  }

  if (modelName.includes("nano")) {
    evolvesTo = "gpt-5";
  } else if (modelName.includes("mini")) {
    evolvesTo = "gpt-5";
  } else if (modelName.includes("gpt-5") && !modelName.includes("nano")) {
    evolvesFrom = "gpt-5-mini";
  }

  return {
    sprite: PROVIDER_SPRITES[provider],
    stats,
    type,
    evolvesFrom,
    evolvesTo,
  };
}

/**
 * Agent Factory - Creates OpenComposer agents based on model configurations
 */
export class AgentFactory {
  /**
   * Create a new agent from model configuration
   */
  static createAgent(
    modelName: string,
    provider: Provider,
    tasks: LLMTask[],
    customName?: string,
  ): OpenComposerAgent {
    const tier = determineAgentTier(modelName);
    const pokemonAttributes = createPokemonAttributes(
      modelName,
      provider,
      tasks,
    );

    // Determine supported features
    const supportsThinking =
      modelName.includes("extended-thinking") ||
      modelName.startsWith("o") ||
      modelName.includes("o1");

    const maxTokens = modelName.includes("haiku") ? 8192 : 10000;

    // Generate agent name
    const name =
      customName ||
      `${provider.toUpperCase()}-${modelName.replace(/[^a-zA-Z0-9]/g, "-").toUpperCase()}`;

    // Generate description
    const description = `${tier.charAt(0).toUpperCase() + tier.slice(1)} tier agent powered by ${provider}'s ${modelName} model. Specialized in ${tasks.join(", ")} tasks.`;

    return {
      id: uuidv4(),
      name,
      modelName,
      provider,
      tier,
      taskSpecializations: tasks,
      pokemonAttributes,
      compatibility: {
        supportedTasks: tasks,
        maxTokens,
        supportsStreaming: true,
        supportsThinking,
      },
      description,
      createdAt: new Date(),
      performance: {
        totalTokensUsed: 0,
        totalRequests: 0,
        successRate: 0,
        averageLatency: 0,
      },
    };
  }

  /**
   * Create default agent set based on open-swe patterns
   */
  static createDefaultAgents(): OpenComposerAgent[] {
    return [
      // Anthropic agents
      this.createAgent(
        "claude-sonnet-4-0",
        "anthropic",
        [LLMTask.PLANNER, LLMTask.PROGRAMMER, LLMTask.REVIEWER],
        "Claude Sonnet",
      ),
      this.createAgent(
        "claude-3-5-haiku-latest",
        "anthropic",
        [LLMTask.ROUTER, LLMTask.SUMMARIZER],
        "Claude Haiku",
      ),

      // OpenAI agents
      this.createAgent(
        "gpt-5",
        "openai",
        [LLMTask.PLANNER, LLMTask.PROGRAMMER, LLMTask.REVIEWER],
        "GPT-5",
      ),
      this.createAgent(
        "gpt-5-mini",
        "openai",
        [LLMTask.SUMMARIZER],
        "GPT-5 Mini",
      ),
      this.createAgent("gpt-5-nano", "openai", [LLMTask.ROUTER], "GPT-5 Nano"),

      // Google agents
      this.createAgent(
        "gemini-2.5-pro",
        "google-genai",
        [LLMTask.PROGRAMMER, LLMTask.SUMMARIZER],
        "Gemini Pro",
      ),
      this.createAgent(
        "gemini-2.5-flash",
        "google-genai",
        [LLMTask.PLANNER, LLMTask.REVIEWER, LLMTask.ROUTER],
        "Gemini Flash",
      ),
    ];
  }
}
