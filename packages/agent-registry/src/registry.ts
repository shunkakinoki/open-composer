import { v4 as uuidv4 } from "uuid";
import type {
  AgentTeam,
  LLMTask,
  OpenComposerAgent,
  Provider,
  SquadConfig,
} from "./types.js";
import { AgentTeamSchema, OpenComposerAgentSchema } from "./types.js";
import { AgentFactory } from "./agent-factory.js";

/**
 * Agent Registry - Manages OpenComposer agents following open-swe patterns
 */
export class AgentRegistry {
  private agents: Map<string, OpenComposerAgent> = new Map();
  private teams: Map<string, AgentTeam> = new Map();

  constructor() {
    // Initialize with default agents
    this.initializeDefaultAgents();
  }

  /**
   * Initialize default agents based on open-swe patterns
   */
  private initializeDefaultAgents(): void {
    const defaultAgents = AgentFactory.createDefaultAgents();
    for (const agent of defaultAgents) {
      this.agents.set(agent.id, agent);
    }
  }

  /**
   * Register a new agent
   */
  registerAgent(agent: OpenComposerAgent): void {
    const validated = OpenComposerAgentSchema.parse(agent);
    this.agents.set(validated.id, validated);
  }

  /**
   * Get agent by ID
   */
  getAgent(id: string): OpenComposerAgent | undefined {
    return this.agents.get(id);
  }

  /**
   * Get all agents
   */
  getAllAgents(): OpenComposerAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents by task specialization
   */
  getAgentsByTask(task: LLMTask): OpenComposerAgent[] {
    return Array.from(this.agents.values()).filter((agent) =>
      agent.taskSpecializations.includes(task),
    );
  }

  /**
   * Get agents by provider
   */
  getAgentsByProvider(provider: Provider): OpenComposerAgent[] {
    return Array.from(this.agents.values()).filter(
      (agent) => agent.provider === provider,
    );
  }

  /**
   * Get agents by tier
   */
  getAgentsByTier(
    tier: "starter" | "evolved" | "legendary",
  ): OpenComposerAgent[] {
    return Array.from(this.agents.values()).filter(
      (agent) => agent.tier === tier,
    );
  }

  /**
   * Create a new agent team
   */
  createTeam(
    name: string,
    description: string,
    agentIds: string[],
    config?: AgentTeam["config"],
  ): AgentTeam {
    const agents = agentIds
      .map((id) => this.agents.get(id))
      .filter((agent): agent is OpenComposerAgent => agent !== undefined);

    if (agents.length === 0) {
      throw new Error("No valid agents found for team creation");
    }

    const team: AgentTeam = {
      id: uuidv4(),
      name,
      description,
      agents,
      createdAt: new Date(),
      config,
    };

    const validated = AgentTeamSchema.parse(team);
    this.teams.set(validated.id, validated);

    return validated;
  }

  /**
   * Create a squad from configuration
   */
  createSquad(squadConfig: SquadConfig): AgentTeam {
    return this.createTeam(
      squadConfig.name,
      squadConfig.description,
      squadConfig.agentIds,
      {
        maxConcurrent: squadConfig.maxConcurrent,
        fallbackEnabled: squadConfig.fallbackEnabled,
        taskDistribution: squadConfig.taskDistribution,
      },
    );
  }

  /**
   * Get team by ID
   */
  getTeam(id: string): AgentTeam | undefined {
    return this.teams.get(id);
  }

  /**
   * Get all teams
   */
  getAllTeams(): AgentTeam[] {
    return Array.from(this.teams.values());
  }

  /**
   * Update agent performance metrics
   */
  updateAgentPerformance(
    agentId: string,
    metrics: {
      tokensUsed: number;
      success: boolean;
      latency: number;
    },
  ): void {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const { tokensUsed, success, latency } = metrics;
    const performance = agent.performance;

    performance.totalTokensUsed += tokensUsed;
    performance.totalRequests += 1;

    // Update success rate
    const totalSuccess =
      (performance.successRate * (performance.totalRequests - 1)) / 100 +
      (success ? 1 : 0);
    performance.successRate =
      (totalSuccess / performance.totalRequests) * 100;

    // Update average latency
    performance.averageLatency =
      (performance.averageLatency * (performance.totalRequests - 1) +
        latency) /
      performance.totalRequests;

    this.agents.set(agentId, agent);
  }

  /**
   * Remove agent from registry
   */
  removeAgent(id: string): boolean {
    return this.agents.delete(id);
  }

  /**
   * Remove team from registry
   */
  removeTeam(id: string): boolean {
    return this.teams.delete(id);
  }

  /**
   * Clear all agents and teams
   */
  clear(): void {
    this.agents.clear();
    this.teams.clear();
  }

  /**
   * Get registry statistics
   */
  getStats() {
    const agents = Array.from(this.agents.values());
    const totalAgents = agents.length;
    const totalTeams = this.teams.size;

    const tierCounts = agents.reduce(
      (acc, agent) => {
        acc[agent.tier]++;
        return acc;
      },
      { starter: 0, evolved: 0, legendary: 0 } as Record<string, number>,
    );

    const providerCounts = agents.reduce(
      (acc, agent) => {
        acc[agent.provider] = (acc[agent.provider] || 0) + 1;
        return acc;
      },
      {} as Record<Provider, number>,
    );

    const totalTokensUsed = agents.reduce(
      (sum, agent) => sum + agent.performance.totalTokensUsed,
      0,
    );

    const totalRequests = agents.reduce(
      (sum, agent) => sum + agent.performance.totalRequests,
      0,
    );

    const averageSuccessRate =
      agents.length > 0
        ? agents.reduce(
            (sum, agent) => sum + agent.performance.successRate,
            0,
          ) / agents.length
        : 0;

    return {
      totalAgents,
      totalTeams,
      tierCounts,
      providerCounts,
      totalTokensUsed,
      totalRequests,
      averageSuccessRate,
    };
  }
}

// Global singleton instance
let globalRegistry: AgentRegistry | null = null;

/**
 * Get the global agent registry instance
 */
export function getAgentRegistry(): AgentRegistry {
  if (!globalRegistry) {
    globalRegistry = new AgentRegistry();
  }
  return globalRegistry;
}

/**
 * Reset the global agent registry
 */
export function resetAgentRegistry(): void {
  globalRegistry = null;
}
