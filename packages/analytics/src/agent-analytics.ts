import type { OpenComposerAgent, Provider } from "@open-composer/agent-registry";

/**
 * Performance metrics for updating agent stats
 */
export interface PerformanceMetrics {
  tokensUsed: number;
  success: boolean;
  latency: number;
}

/**
 * Registry statistics
 */
export interface RegistryStats {
  totalAgents: number;
  totalTeams: number;
  tierCounts: Record<string, number>;
  providerCounts: Record<string, number>;
  totalTokensUsed: number;
  totalRequests: number;
  averageSuccessRate: number;
}

/**
 * Agent Analytics Service
 * Handles performance tracking and statistics for agents
 */
export class AgentAnalytics {
  /**
   * Update agent performance metrics
   */
  static updateAgentPerformance(
    agent: OpenComposerAgent,
    metrics: PerformanceMetrics,
  ): void {
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
  }

  /**
   * Calculate registry statistics from agents and teams
   */
  static calculateStats(
    agents: OpenComposerAgent[],
    teamCount: number,
  ): RegistryStats {
    const totalAgents = agents.length;
    const totalTeams = teamCount;

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
      totalRequests > 0
        ? agents.reduce(
            (sum, agent) =>
              sum +
              agent.performance.successRate * agent.performance.totalRequests,
            0,
          ) / totalRequests
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

  /**
   * Get performance summary for an agent
   */
  static getAgentPerformanceSummary(agent: OpenComposerAgent) {
    return {
      agentId: agent.id,
      agentName: agent.name,
      totalRequests: agent.performance.totalRequests,
      totalTokensUsed: agent.performance.totalTokensUsed,
      successRate: agent.performance.successRate,
      averageLatency: agent.performance.averageLatency,
      averageTokensPerRequest:
        agent.performance.totalRequests > 0
          ? agent.performance.totalTokensUsed / agent.performance.totalRequests
          : 0,
    };
  }

  /**
   * Compare performance between two agents
   */
  static compareAgentPerformance(
    agent1: OpenComposerAgent,
    agent2: OpenComposerAgent,
  ) {
    const perf1 = agent1.performance;
    const perf2 = agent2.performance;

    return {
      agent1: {
        name: agent1.name,
        ...this.getAgentPerformanceSummary(agent1),
      },
      agent2: {
        name: agent2.name,
        ...this.getAgentPerformanceSummary(agent2),
      },
      comparison: {
        tokensDiff: perf1.totalTokensUsed - perf2.totalTokensUsed,
        successRateDiff: perf1.successRate - perf2.successRate,
        latencyDiff: perf1.averageLatency - perf2.averageLatency,
        requestsDiff: perf1.totalRequests - perf2.totalRequests,
      },
    };
  }
}
