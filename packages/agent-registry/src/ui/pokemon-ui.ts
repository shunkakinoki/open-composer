import chalk from "chalk";
import type { AgentTeam, OpenComposerAgent } from "../types.js";

/**
 * Pokemon-style UI renderer for agents
 */
export class PokemonUI {
  /**
   * Render agent card in Pokemon style
   */
  static renderAgentCard(agent: OpenComposerAgent): string {
    const { name, tier, pokemonAttributes, provider, modelName, performance } =
      agent;
    const { sprite, stats, type, evolvesFrom, evolvesTo } = pokemonAttributes;

    const tierColor =
      tier === "legendary"
        ? chalk.yellow
        : tier === "evolved"
          ? chalk.blue
          : chalk.green;

    const statBars = this.renderStatBars(stats);

    const evolutionInfo =
      evolvesFrom || evolvesTo
        ? `\n${chalk.gray("Evolution:")} ${evolvesFrom ? `← ${evolvesFrom}` : ""} ${evolvesTo ? `→ ${evolvesTo}` : ""}`
        : "";

    return `
╔════════════════════════════════════════╗
║  ${sprite}  ${tierColor.bold(name.padEnd(35))}║
╠════════════════════════════════════════╣
║  ${chalk.cyan("Type:")} ${type.padEnd(31)}║
║  ${chalk.cyan("Tier:")} ${tierColor(tier.padEnd(31))}║
║  ${chalk.cyan("Provider:")} ${provider.padEnd(27)}║
║  ${chalk.cyan("Model:")} ${modelName.padEnd(29)}║
╠════════════════════════════════════════╣
║  ${chalk.bold("Stats")}                              ║
${statBars}
╠════════════════════════════════════════╣
║  ${chalk.bold("Performance")}                        ║
║  ${chalk.cyan("Requests:")} ${String(performance.totalRequests).padEnd(27)}║
║  ${chalk.cyan("Tokens:")} ${String(performance.totalTokensUsed).padEnd(29)}║
║  ${chalk.cyan("Success:")} ${String(performance.successRate.toFixed(1)).padEnd(28)}%║
║  ${chalk.cyan("Latency:")} ${String(performance.averageLatency.toFixed(0)).padEnd(26)}ms║${evolutionInfo}
╚════════════════════════════════════════╝
`;
  }

  /**
   * Render stat bars
   */
  private static renderStatBars(stats: {
    speed: number;
    accuracy: number;
    power: number;
    efficiency: number;
    versatility: number;
  }): string {
    const renderBar = (label: string, value: number): string => {
      const barLength = 20;
      const filled = Math.round((value / 100) * barLength);
      const empty = barLength - filled;

      const bar =
        chalk.green("█".repeat(filled)) + chalk.gray("░".repeat(empty));
      const valueStr = String(value).padStart(3);

      return `║  ${label.padEnd(12)} ${bar} ${valueStr}║`;
    };

    return [
      renderBar("Speed", stats.speed),
      renderBar("Accuracy", stats.accuracy),
      renderBar("Power", stats.power),
      renderBar("Efficiency", stats.efficiency),
      renderBar("Versatility", stats.versatility),
    ].join("\n");
  }

  /**
   * Render compact agent list
   */
  static renderAgentList(agents: OpenComposerAgent[]): string {
    const header = chalk.bold(
      `\n${"#".padEnd(4)}${"Name".padEnd(25)}${"Type".padEnd(20)}${"Tier".padEnd(15)}${"Provider".padEnd(15)}\n`,
    );
    const separator = chalk.gray("─".repeat(79) + "\n");

    const rows = agents
      .map((agent, index) => {
        const tierColor =
          agent.tier === "legendary"
            ? chalk.yellow
            : agent.tier === "evolved"
              ? chalk.blue
              : chalk.green;

        return [
          String(index + 1).padEnd(4),
          `${agent.pokemonAttributes.sprite} ${agent.name}`.padEnd(25),
          agent.pokemonAttributes.type.padEnd(20),
          tierColor(agent.tier.padEnd(15)),
          agent.provider.padEnd(15),
        ].join("");
      })
      .join("\n");

    return header + separator + rows + "\n";
  }

  /**
   * Render team composition
   */
  static renderTeam(team: AgentTeam): string {
    const { name, description, agents, config } = team;

    const header = `
╔════════════════════════════════════════════════════════╗
║  ${chalk.bold.cyan("SQUAD:")} ${name.padEnd(45)}║
║  ${chalk.gray(description.slice(0, 50).padEnd(50))}║
╠════════════════════════════════════════════════════════╣`;

    const configInfo = config
      ? `
║  ${chalk.cyan("Configuration:")}                                    ║
║    Max Concurrent: ${String(config.maxConcurrent).padEnd(32)}║
║    Task Distribution: ${config.taskDistribution?.padEnd(27)}║
║    Fallback: ${String(config.fallbackEnabled).padEnd(36)}║
╠════════════════════════════════════════════════════════╣`
      : "";

    const agentsList = agents
      .map(
        (agent, i) => `
║  ${String(i + 1)}. ${agent.pokemonAttributes.sprite} ${agent.name.padEnd(45)}║
║     ${chalk.gray(`${agent.tier} | ${agent.provider} | ${agent.modelName}`.slice(0, 50).padEnd(50))}║`,
      )
      .join("");

    const footer = `
╚════════════════════════════════════════════════════════╝`;

    return header + configInfo + agentsList + footer;
  }

  /**
   * Render agent evolution tree
   */
  static renderEvolutionTree(agent: OpenComposerAgent): string {
    const { name, pokemonAttributes } = agent;
    const { evolvesFrom, evolvesTo } = pokemonAttributes;

    let tree = chalk.bold.cyan(`Evolution Tree for ${name}:\n\n`);

    if (evolvesFrom) {
      tree += `  ${chalk.gray(evolvesFrom)}\n`;
      tree += `    ${chalk.gray("↓")}\n`;
    }

    tree += `  ${chalk.bold.green(name)} ${pokemonAttributes.sprite}\n`;

    if (evolvesTo) {
      tree += `    ${chalk.gray("↓")}\n`;
      tree += `  ${chalk.yellow(evolvesTo)}\n`;
    }

    return tree;
  }

  /**
   * Render task specializations
   */
  static renderTaskSpecializations(agent: OpenComposerAgent): string {
    const taskIcons: Record<string, string> = {
      planner: "🧭",
      programmer: "⚡",
      reviewer: "🔍",
      router: "🌊",
      summarizer: "🌿",
    };

    const header = chalk.bold.cyan(
      `\nTask Specializations for ${agent.name}:\n\n`,
    );

    const tasks = agent.taskSpecializations
      .map((task) => `  ${taskIcons[task] || "📋"} ${chalk.green(task)}`)
      .join("\n");

    return header + tasks + "\n";
  }

  /**
   * Render registry statistics
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
║  ${chalk.bold.cyan("Agent Registry Statistics")}        ║
╠════════════════════════════════════════╣
║  ${chalk.cyan("Total Agents:")} ${String(stats.totalAgents).padEnd(24)}║
║  ${chalk.cyan("Total Squads:")} ${String(stats.totalTeams).padEnd(24)}║
╠════════════════════════════════════════╣
║  ${chalk.bold("Tiers")}                             ║
║    Starter: ${String(stats.tierCounts.starter || 0).padEnd(27)}║
║    Evolved: ${String(stats.tierCounts.evolved || 0).padEnd(27)}║
║    Legendary: ${String(stats.tierCounts.legendary || 0).padEnd(25)}║
╠════════════════════════════════════════╣
║  ${chalk.bold("Performance")}                        ║
║  ${chalk.cyan("Total Requests:")} ${String(stats.totalRequests).padEnd(20)}║
║  ${chalk.cyan("Total Tokens:")} ${String(stats.totalTokensUsed).padEnd(22)}║
║  ${chalk.cyan("Avg Success:")} ${String(stats.averageSuccessRate.toFixed(1)).padEnd(21)}%║
╚════════════════════════════════════════╝
`;
  }

  /**
   * Render comparison between two agents
   */
  static renderComparison(
    agent1: OpenComposerAgent,
    agent2: OpenComposerAgent,
  ): string {
    const header = chalk.bold.cyan(
      `\nAgent Comparison: ${agent1.name} vs ${agent2.name}\n\n`,
    );

    const compareStats = (
      label: string,
      val1: number,
      val2: number,
    ): string => {
      const winner = val1 > val2 ? chalk.green : val1 < val2 ? chalk.red : chalk.yellow;
      const winner2 = val2 > val1 ? chalk.green : val2 < val1 ? chalk.red : chalk.yellow;

      return `  ${label.padEnd(15)} ${winner(String(val1).padStart(3))}  ${chalk.gray("vs")}  ${winner2(String(val2).padStart(3))}`;
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
