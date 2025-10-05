/**
 * Legacy string-based Pokemon UI renderer
 *
 * This file provides backward compatibility for the old PokemonUI class API.
 * The actual React components are now in apps/cli/src/components/PokemonUI.tsx
 *
 * Note: This is a placeholder that returns simple string representations.
 * For rich terminal UI, use the React components directly with Ink.
 */

import type { AgentTeam, OpenComposerAgent } from "../types.js";

/**
 * Pokemon-style UI renderer for agents (legacy string-based API)
 * @deprecated Use React components from apps/cli/src/components/PokemonUI.tsx instead
 */
export class PokemonUI {
  /**
   * Render agent card in Pokemon style
   * @deprecated Use <AgentCard> React component instead
   */
  static renderAgentCard(agent: OpenComposerAgent): string {
    const { name, tier, pokemonAttributes, provider, modelName, performance } = agent;
    const { sprite, stats, type } = pokemonAttributes;

    return `
╔════════════════════════════════════════╗
║  ${sprite}  ${name.padEnd(35)}║
╠════════════════════════════════════════╣
║  Type: ${type.padEnd(31)}║
║  Tier: ${tier.padEnd(31)}║
║  Provider: ${provider.padEnd(27)}║
║  Model: ${modelName.padEnd(29)}║
╠════════════════════════════════════════╣
║  Stats                              ║
║  Speed       ${"█".repeat(Math.round(stats.speed / 5))}${"░".repeat(20 - Math.round(stats.speed / 5))} ${stats.speed}║
║  Accuracy    ${"█".repeat(Math.round(stats.accuracy / 5))}${"░".repeat(20 - Math.round(stats.accuracy / 5))} ${stats.accuracy}║
║  Power       ${"█".repeat(Math.round(stats.power / 5))}${"░".repeat(20 - Math.round(stats.power / 5))} ${stats.power}║
║  Efficiency  ${"█".repeat(Math.round(stats.efficiency / 5))}${"░".repeat(20 - Math.round(stats.efficiency / 5))} ${stats.efficiency}║
║  Versatility ${"█".repeat(Math.round(stats.versatility / 5))}${"░".repeat(20 - Math.round(stats.versatility / 5))} ${stats.versatility}║
╠════════════════════════════════════════╣
║  Performance                        ║
║  Requests: ${String(performance.totalRequests).padEnd(27)}║
║  Tokens: ${String(performance.totalTokensUsed).padEnd(29)}║
║  Success: ${String(performance.successRate.toFixed(1)).padEnd(28)}%║
║  Latency: ${String(performance.averageLatency.toFixed(0)).padEnd(26)}ms║
╚════════════════════════════════════════╝
`;
  }

  /**
   * Render compact agent list
   * @deprecated Use <AgentList> React component instead
   */
  static renderAgentList(agents: OpenComposerAgent[]): string {
    const header = `\n${"#".padEnd(4)}${"Name".padEnd(25)}${"Type".padEnd(20)}${"Tier".padEnd(15)}${"Provider".padEnd(15)}\n`;
    const separator = "─".repeat(79) + "\n";

    const rows = agents
      .map((agent, index) => {
        return [
          String(index + 1).padEnd(4),
          `${agent.pokemonAttributes.sprite} ${agent.name}`.padEnd(25),
          agent.pokemonAttributes.type.padEnd(20),
          agent.tier.padEnd(15),
          agent.provider.padEnd(15),
        ].join("");
      })
      .join("\n");

    return header + separator + rows + "\n";
  }

  /**
   * Render team composition
   * @deprecated Use <TeamDisplay> React component instead
   */
  static renderTeam(team: AgentTeam): string {
    const { name, description, agents, config } = team;

    const header = `
╔════════════════════════════════════════════════════════╗
║  SQUAD: ${name.padEnd(45)}║
║  ${description.slice(0, 50).padEnd(50)}║
╠════════════════════════════════════════════════════════╣`;

    const configInfo = config
      ? `
║  Configuration:                                    ║
║    Max Concurrent: ${String(config.maxConcurrent).padEnd(32)}║
║    Task Distribution: ${(config.taskDistribution || "").padEnd(27)}║
║    Fallback: ${String(config.fallbackEnabled).padEnd(36)}║
╠════════════════════════════════════════════════════════╣`
      : "";

    const agentsList = agents
      .map(
        (agent, i) => `
║  ${String(i + 1)}. ${agent.pokemonAttributes.sprite} ${agent.name.padEnd(45)}║
║     ${`${agent.tier} | ${agent.provider} | ${agent.modelName}`.slice(0, 50).padEnd(50)}║`,
      )
      .join("");

    const footer = `
╚════════════════════════════════════════════════════════╝`;

    return header + configInfo + agentsList + footer;
  }

  /**
   * Render agent evolution tree
   * @deprecated Use <EvolutionTree> React component instead
   */
  static renderEvolutionTree(agent: OpenComposerAgent): string {
    const { name, pokemonAttributes } = agent;
    const { evolvesFrom, evolvesTo } = pokemonAttributes;

    let tree = `Evolution Tree for ${name}:\n\n`;

    if (evolvesFrom) {
      tree += `  ${evolvesFrom}\n`;
      tree += `    ↓\n`;
    }

    tree += `  ${name} ${pokemonAttributes.sprite}\n`;

    if (evolvesTo) {
      tree += `    ↓\n`;
      tree += `  ${evolvesTo}\n`;
    }

    return tree;
  }

  /**
   * Render task specializations
   * @deprecated Use <TaskSpecializations> React component instead
   */
  static renderTaskSpecializations(agent: OpenComposerAgent): string {
    const taskIcons: Record<string, string> = {
      planner: "🧭",
      programmer: "⚡",
      reviewer: "🔍",
      router: "🌊",
      summarizer: "🌿",
    };

    const header = `\nTask Specializations for ${agent.name}:\n\n`;

    const tasks = agent.taskSpecializations
      .map((task) => `  ${taskIcons[task] || "📋"} ${task}`)
      .join("\n");

    return header + tasks + "\n";
  }

  /**
   * Render registry statistics
   * @deprecated Use <RegistryStats> React component instead
   */
  static renderStats(stats: {
    totalAgents: number;
    totalTeams: number;
    tierCounts: Record<string, number>;
    providerCounts: Record<string, number>;
    totalTokensUsed: number;
    totalRequests: number;
    averageSuccessRate: number;
  }): string {
    return `
╔════════════════════════════════════════╗
║  Agent Registry Statistics        ║
╠════════════════════════════════════════╣
║  Total Agents: ${String(stats.totalAgents).padEnd(24)}║
║  Total Squads: ${String(stats.totalTeams).padEnd(24)}║
╠════════════════════════════════════════╣
║  Tiers                             ║
║    Starter: ${String(stats.tierCounts.starter || 0).padEnd(27)}║
║    Evolved: ${String(stats.tierCounts.evolved || 0).padEnd(27)}║
║    Legendary: ${String(stats.tierCounts.legendary || 0).padEnd(25)}║
╠════════════════════════════════════════╣
║  Performance                        ║
║  Total Requests: ${String(stats.totalRequests).padEnd(20)}║
║  Total Tokens: ${String(stats.totalTokensUsed).padEnd(22)}║
║  Avg Success: ${String(stats.averageSuccessRate.toFixed(1)).padEnd(21)}%║
╚════════════════════════════════════════╝
`;
  }

  /**
   * Render comparison between two agents
   * @deprecated Use <AgentComparison> React component instead
   */
  static renderComparison(
    agent1: OpenComposerAgent,
    agent2: OpenComposerAgent,
  ): string {
    const header = `\nAgent Comparison: ${agent1.name} vs ${agent2.name}\n\n`;

    const compareStats = (
      label: string,
      val1: number,
      val2: number,
    ): string => {
      return `  ${label.padEnd(15)} ${String(val1).padStart(3)}  vs  ${String(val2).padStart(3)}`;
    };

    const stats1 = agent1.pokemonAttributes.stats;
    const stats2 = agent2.pokemonAttributes.stats;

    const comparison = [
      compareStats("Speed", stats1.speed, stats2.speed),
      compareStats("Accuracy", stats1.accuracy, stats2.accuracy),
      compareStats("Power", stats1.power, stats2.power),
      compareStats("Efficiency", stats1.efficiency, stats2.efficiency),
      compareStats("Versatility", stats1.versatility, stats2.versatility),
    ].join("\n");

    return header + comparison + "\n";
  }
}
