#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { startSquadSelector } from "../ui/squad-selector.js";
import { getAgentRegistry } from "../registry.js";
import { getSquadLauncher } from "../squad-launcher.js";
import { PokemonUI } from "../ui/pokemon-ui.js";
import type { LLMTask } from "../types.js";

const program = new Command();

program
  .name("squad")
  .description("Launch custom agent squads with Pokemon-style configuration")
  .version("0.1.0");

/**
 * Interactive mode - Pokemon-style UI
 */
program
  .command("interactive")
  .alias("i")
  .description("Start interactive squad manager (Pokemon-style UI)")
  .action(async () => {
    await startSquadSelector();
  });

/**
 * Quick squad creation
 */
program
  .command("quick <task>")
  .alias("q")
  .description("Quickly create a squad for a specific task")
  .option("-n, --name <name>", "Squad name")
  .option("-l, --launch", "Launch squad immediately after creation")
  .action(async (task: string, options: { name?: string; launch?: boolean }) => {
    const launcher = getSquadLauncher();

    try {
      const team = launcher.createQuickSquad(task as LLMTask, options.name);

      console.log(chalk.green("\n✅ Squad created successfully!\n"));
      console.log(PokemonUI.renderTeam(team));

      if (options.launch) {
        console.log(chalk.cyan("\n🚀 Launching squad...\n"));
        const results = await launcher.launchSquad(team.id, {
          task: task as LLMTask,
          priority: 1,
        });

        console.log(chalk.bold.green("\n✅ Squad execution complete!\n"));
        for (const result of results) {
          console.log(
            `  ${result.success ? "✅" : "❌"} ${result.agentName}: ${result.success ? chalk.green("Success") : chalk.red("Failed")}`,
          );
          console.log(
            `     Tokens: ${result.tokensUsed}, Latency: ${result.latency}ms`,
          );
        }
      }
    } catch (error) {
      console.error(
        chalk.red("\n❌ Error:"),
        error instanceof Error ? error.message : error,
      );
      process.exit(1);
    }
  });

/**
 * List all agents
 */
program
  .command("list-agents")
  .alias("la")
  .description("List all available agents")
  .option("-t, --tier <tier>", "Filter by tier (starter|evolved|legendary)")
  .option("-p, --provider <provider>", "Filter by provider")
  .option("-k, --task <task>", "Filter by task specialization")
  .action((options: { tier?: string; provider?: string; task?: string }) => {
    const registry = getAgentRegistry();
    let agents = registry.getAllAgents();

    if (options.tier) {
      agents = registry.getAgentsByTier(
        options.tier as "starter" | "evolved" | "legendary",
      );
    }

    if (options.provider) {
      agents = registry.getAgentsByProvider(options.provider as any);
    }

    if (options.task) {
      agents = registry.getAgentsByTask(options.task as LLMTask);
    }

    console.log(PokemonUI.renderAgentList(agents));
  });

/**
 * List all squads
 */
program
  .command("list-squads")
  .alias("ls")
  .description("List all created squads")
  .action(() => {
    const registry = getAgentRegistry();
    const teams = registry.getAllTeams();

    if (teams.length === 0) {
      console.log(chalk.yellow("\n⚠️  No squads available.\n"));
      return;
    }

    console.log(chalk.bold.cyan("\n=== Available Squads ===\n"));
    for (const team of teams) {
      console.log(PokemonUI.renderTeam(team));
    }
  });

/**
 * Show agent details
 */
program
  .command("show <agentId>")
  .description("Show detailed information about an agent")
  .action((agentId: string) => {
    const registry = getAgentRegistry();
    const agent = registry.getAgent(agentId);

    if (!agent) {
      console.error(chalk.red(`\n❌ Agent ${agentId} not found\n`));
      process.exit(1);
    }

    console.log(PokemonUI.renderAgentCard(agent));
    console.log(PokemonUI.renderTaskSpecializations(agent));
    console.log(PokemonUI.renderEvolutionTree(agent));
  });

/**
 * Compare agents
 */
program
  .command("compare <agent1Id> <agent2Id>")
  .description("Compare two agents")
  .action((agent1Id: string, agent2Id: string) => {
    const registry = getAgentRegistry();
    const agent1 = registry.getAgent(agent1Id);
    const agent2 = registry.getAgent(agent2Id);

    if (!agent1) {
      console.error(chalk.red(`\n❌ Agent ${agent1Id} not found\n`));
      process.exit(1);
    }

    if (!agent2) {
      console.error(chalk.red(`\n❌ Agent ${agent2Id} not found\n`));
      process.exit(1);
    }

    console.log(PokemonUI.renderComparison(agent1, agent2));
  });

/**
 * Show registry statistics
 */
program
  .command("stats")
  .description("Show registry statistics")
  .action(() => {
    const registry = getAgentRegistry();
    const stats = registry.getStats();
    console.log(PokemonUI.renderStats(stats));
  });

/**
 * Launch a squad
 */
program
  .command("launch <squadId> <task>")
  .description("Launch an existing squad for a task")
  .action(async (squadId: string, task: string) => {
    const launcher = getSquadLauncher();

    try {
      console.log(chalk.cyan("\n🚀 Launching squad...\n"));

      const results = await launcher.launchSquad(squadId, {
        task: task as LLMTask,
        priority: 1,
      });

      console.log(chalk.bold.green("\n✅ Squad execution complete!\n"));

      for (const result of results) {
        const statusIcon = result.success ? "✅" : "❌";
        const statusColor = result.success ? chalk.green : chalk.red;

        console.log(
          `  ${statusIcon} ${result.agentName}: ${statusColor(result.success ? "Success" : "Failed")}`,
        );
        console.log(
          `     Tokens: ${result.tokensUsed}, Latency: ${result.latency}ms`,
        );
        if (result.error) {
          console.log(chalk.red(`     Error: ${result.error}`));
        }
      }
    } catch (error) {
      console.error(
        chalk.red("\n❌ Error:"),
        error instanceof Error ? error.message : error,
      );
      process.exit(1);
    }
  });

/**
 * Default command - show help or start interactive mode
 */
program.action(() => {
  console.log(
    chalk.bold.cyan(`
╔════════════════════════════════════════╗
║                                        ║
║   🎮 Agent Registry Squad Manager 🎮   ║
║                                        ║
║   Pokemon-Style Agent Configuration    ║
║                                        ║
╚════════════════════════════════════════╝
`),
  );

  console.log(chalk.yellow("\nNo command specified. Use --help to see available commands.\n"));
  console.log(chalk.cyan("Quick start: squad interactive\n"));
  program.help();
});

// Parse arguments
program.parse(process.argv);

// If no arguments provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
