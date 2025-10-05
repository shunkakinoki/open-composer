import type { AgentTeam, LLMTask, OpenComposerAgent } from "./types.js";
import { getAgentRegistry } from "./registry.js";

/**
 * Task assignment strategy for squad execution
 */
export type TaskAssignmentStrategy = "round-robin" | "specialized" | "balanced";

/**
 * Squad execution context
 */
export interface SquadExecutionContext {
  task: LLMTask;
  priority: number;
  metadata?: Record<string, unknown>;
}

/**
 * Squad execution result
 */
export interface SquadExecutionResult {
  agentId: string;
  agentName: string;
  success: boolean;
  tokensUsed: number;
  latency: number;
  error?: string;
}

/**
 * Squad Launcher - Manages squad execution with pre-set configurations
 */
export class SquadLauncher {
  private registry = getAgentRegistry();

  /**
   * Launch a squad with the given configuration
   */
  async launchSquad(
    teamId: string,
    context: SquadExecutionContext,
  ): Promise<SquadExecutionResult[]> {
    const team = this.registry.getTeam(teamId);
    if (!team) {
      throw new Error(`Team ${teamId} not found`);
    }

    const strategy = team.config?.taskDistribution || "specialized";
    const maxConcurrent = team.config?.maxConcurrent || 3;

    // Filter agents that can handle the task
    const capableAgents = team.agents.filter((agent) =>
      agent.taskSpecializations.includes(context.task),
    );

    if (capableAgents.length === 0) {
      throw new Error(
        `No agents in team ${team.name} can handle task ${context.task}`,
      );
    }

    // Select agents based on strategy
    const selectedAgents = this.selectAgents(
      capableAgents,
      strategy,
      context,
      maxConcurrent,
    );

    // Execute tasks with selected agents
    const results = await this.executeWithAgents(selectedAgents, context, team);

    return results;
  }

  /**
   * Select agents based on the assignment strategy
   */
  private selectAgents(
    agents: OpenComposerAgent[],
    strategy: TaskAssignmentStrategy,
    context: SquadExecutionContext,
    maxConcurrent: number,
  ): OpenComposerAgent[] {
    switch (strategy) {
      case "specialized":
        return this.selectSpecialized(agents, context.task, maxConcurrent);
      case "balanced":
        return this.selectBalanced(agents, maxConcurrent);
      case "round-robin":
        return this.selectRoundRobin(agents, maxConcurrent);
      default:
        return agents.slice(0, maxConcurrent);
    }
  }

  /**
   * Select specialized agents (highest accuracy for the task)
   */
  private selectSpecialized(
    agents: OpenComposerAgent[],
    task: LLMTask,
    maxConcurrent: number,
  ): OpenComposerAgent[] {
    return agents
      .sort((a, b) => {
        // Primary sort: agents specialized in this task first
        const aSpecialized = a.taskSpecializations.includes(task) ? 1 : 0;
        const bSpecialized = b.taskSpecializations.includes(task) ? 1 : 0;
        if (aSpecialized !== bSpecialized) {
          return bSpecialized - aSpecialized;
        }

        // Secondary sort: by accuracy
        return (
          b.pokemonAttributes.stats.accuracy -
          a.pokemonAttributes.stats.accuracy
        );
      })
      .slice(0, maxConcurrent);
  }

  /**
   * Select balanced agents (best overall stats)
   */
  private selectBalanced(
    agents: OpenComposerAgent[],
    maxConcurrent: number,
  ): OpenComposerAgent[] {
    return agents
      .sort((a, b) => {
        const aAvg = this.calculateAverageStats(a);
        const bAvg = this.calculateAverageStats(b);
        return bAvg - aAvg;
      })
      .slice(0, maxConcurrent);
  }

  /**
   * Select agents in round-robin fashion
   */
  private selectRoundRobin(
    agents: OpenComposerAgent[],
    maxConcurrent: number,
  ): OpenComposerAgent[] {
    // Simple round-robin: take agents in order
    return agents.slice(0, maxConcurrent);
  }

  /**
   * Calculate average stats for an agent
   */
  private calculateAverageStats(agent: OpenComposerAgent): number {
    const stats = agent.pokemonAttributes.stats;
    return (
      (stats.accuracy +
        stats.power +
        stats.speed +
        stats.efficiency +
        stats.versatility) /
      5
    );
  }

  /**
   * Execute task with selected agents
   */
  private async executeWithAgents(
    agents: OpenComposerAgent[],
    context: SquadExecutionContext,
    team: AgentTeam,
  ): Promise<SquadExecutionResult[]> {
    const results: SquadExecutionResult[] = [];
    const fallbackEnabled = team.config?.fallbackEnabled ?? true;

    for (const agent of agents) {
      const startTime = Date.now();

      try {
        // Simulate agent execution (to be implemented with actual LLM calls)
        const result = await this.executeAgent(agent, context);
        const latency = Date.now() - startTime;

        results.push({
          agentId: agent.id,
          agentName: agent.name,
          success: result.success,
          tokensUsed: result.tokensUsed,
          latency,
        });

        // Update performance metrics
        this.registry.updateAgentPerformance(agent.id, {
          tokensUsed: result.tokensUsed,
          success: result.success,
          latency,
        });

        // If successful and not using fallback, break
        if (result.success && !fallbackEnabled) {
          break;
        }
      } catch (error) {
        const latency = Date.now() - startTime;
        results.push({
          agentId: agent.id,
          agentName: agent.name,
          success: false,
          tokensUsed: 0,
          latency,
          error: error instanceof Error ? error.message : "Unknown error",
        });

        // Update performance metrics
        this.registry.updateAgentPerformance(agent.id, {
          tokensUsed: 0,
          success: false,
          latency,
        });
      }
    }

    return results;
  }

  /**
   * Execute a single agent (stub for actual implementation)
   */
  private async executeAgent(
    agent: OpenComposerAgent,
    context: SquadExecutionContext,
  ): Promise<{ success: boolean; tokensUsed: number }> {
    // TODO: Implement actual LLM execution using open-swe patterns
    // This is a stub that simulates execution
    return new Promise((resolve) => {
      setTimeout(() => {
        const success = Math.random() > 0.1; // 90% success rate
        const tokensUsed = Math.floor(Math.random() * 1000) + 100;
        resolve({ success, tokensUsed });
      }, 100);
    });
  }

  /**
   * Get recommended agents for a task
   */
  getRecommendedAgents(
    task: LLMTask,
    count = 3,
  ): OpenComposerAgent[] {
    const agents = this.registry.getAgentsByTask(task);
    return this.selectSpecialized(agents, task, count);
  }

  /**
   * Create a quick squad for a specific task
   */
  createQuickSquad(
    task: LLMTask,
    squadName?: string,
  ): AgentTeam {
    const recommendedAgents = this.getRecommendedAgents(task, 3);

    if (recommendedAgents.length === 0) {
      throw new Error(`No agents available for task ${task}`);
    }

    const name = squadName || `Quick Squad - ${task}`;
    const description = `Auto-generated squad for ${task} task with ${recommendedAgents.length} agents`;

    return this.registry.createTeam(
      name,
      description,
      recommendedAgents.map((a) => a.id),
      {
        maxConcurrent: 3,
        fallbackEnabled: true,
        taskDistribution: "specialized",
      },
    );
  }
}

// Global singleton instance
let globalSquadLauncher: SquadLauncher | null = null;

/**
 * Get the global squad launcher instance
 */
export function getSquadLauncher(): SquadLauncher {
  if (!globalSquadLauncher) {
    globalSquadLauncher = new SquadLauncher();
  }
  return globalSquadLauncher;
}

/**
 * Reset the global squad launcher
 */
export function resetSquadLauncher(): void {
  globalSquadLauncher = null;
}
