import inquirer from "inquirer";
import chalk from "chalk";
import type { LLMTask, OpenComposerAgent, SquadConfig } from "../types.js";
import { getAgentRegistry } from "../registry.js";
import { getSquadLauncher } from "../squad-launcher.js";
import { PokemonUI } from "./pokemon-ui.js";

/**
 * Interactive squad selector UI
 */
export class SquadSelector {
  private registry = getAgentRegistry();
  private squadLauncher = getSquadLauncher();

  /**
   * Main menu for squad selection
   */
  async showMainMenu(): Promise<void> {
    const { action } = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: chalk.cyan.bold("What would you like to do?"),
        choices: [
          { name: "🎯 Create Quick Squad", value: "quick" },
          { name: "🏗️  Build Custom Squad", value: "custom" },
          { name: "👥 View All Agents", value: "view-agents" },
          { name: "🎖️  View All Squads", value: "view-squads" },
          { name: "📊 View Registry Stats", value: "stats" },
          { name: "🆚 Compare Agents", value: "compare" },
          { name: "❌ Exit", value: "exit" },
        ],
      },
    ]);

    switch (action) {
      case "quick":
        await this.createQuickSquad();
        break;
      case "custom":
        await this.buildCustomSquad();
        break;
      case "view-agents":
        await this.viewAllAgents();
        break;
      case "view-squads":
        await this.viewAllSquads();
        break;
      case "stats":
        this.viewStats();
        break;
      case "compare":
        await this.compareAgents();
        break;
      case "exit":
        console.log(chalk.yellow("\n👋 Goodbye!\n"));
        return;
    }

    // Show menu again unless exiting
    if (action !== "exit") {
      await this.showMainMenu();
    }
  }

  /**
   * Create a quick squad for a specific task
   */
  async createQuickSquad(): Promise<void> {
    const { task } = await inquirer.prompt([
      {
        type: "list",
        name: "task",
        message: "Select the task for your squad:",
        choices: [
          { name: "🧭 Planner", value: "planner" },
          { name: "⚡ Programmer", value: "programmer" },
          { name: "🔍 Reviewer", value: "reviewer" },
          { name: "🌊 Router", value: "router" },
          { name: "🌿 Summarizer", value: "summarizer" },
        ],
      },
    ]);

    const { squadName } = await inquirer.prompt([
      {
        type: "input",
        name: "squadName",
        message: "Enter squad name (optional):",
      },
    ]);

    try {
      const team = this.squadLauncher.createQuickSquad(
        task as LLMTask,
        squadName || undefined,
      );

      console.log(chalk.green("\n✅ Squad created successfully!\n"));
      console.log(PokemonUI.renderTeam(team));

      const { launch } = await inquirer.prompt([
        {
          type: "confirm",
          name: "launch",
          message: "Would you like to launch this squad now?",
          default: false,
        },
      ]);

      if (launch) {
        await this.launchSquad(team.id, task as LLMTask);
      }
    } catch (error) {
      console.error(
        chalk.red("\n❌ Error creating squad:"),
        error instanceof Error ? error.message : error,
      );
    }
  }

  /**
   * Build a custom squad by selecting agents
   */
  async buildCustomSquad(): Promise<void> {
    const allAgents = this.registry.getAllAgents();

    if (allAgents.length === 0) {
      console.log(chalk.yellow("\n⚠️  No agents available in registry.\n"));
      return;
    }

    const { selectedAgents } = await inquirer.prompt([
      {
        type: "checkbox",
        name: "selectedAgents",
        message: "Select agents for your squad:",
        choices: allAgents.map((agent) => ({
          name: `${agent.pokemonAttributes.sprite} ${agent.name} (${agent.tier} | ${agent.provider})`,
          value: agent.id,
        })),
        validate: (input: string[]) =>
          input.length > 0 ? true : "Please select at least one agent",
      },
    ]);

    const { squadName, squadDescription, taskDistribution, maxConcurrent } =
      await inquirer.prompt([
        {
          type: "input",
          name: "squadName",
          message: "Enter squad name:",
          validate: (input: string) =>
            input.trim() ? true : "Name cannot be empty",
        },
        {
          type: "input",
          name: "squadDescription",
          message: "Enter squad description:",
          default: "Custom agent squad",
        },
        {
          type: "list",
          name: "taskDistribution",
          message: "Select task distribution strategy:",
          choices: [
            {
              name: "🎯 Specialized (best for specific tasks)",
              value: "specialized",
            },
            { name: "⚖️  Balanced (best overall)", value: "balanced" },
            { name: "🔄 Round Robin (sequential)", value: "round-robin" },
          ],
        },
        {
          type: "number",
          name: "maxConcurrent",
          message: "Maximum concurrent agents:",
          default: 3,
          validate: (input: number) =>
            input > 0 && input <= 10 ? true : "Must be between 1 and 10",
        },
      ]);

    const config: SquadConfig = {
      name: squadName,
      description: squadDescription,
      agentIds: selectedAgents,
      taskDistribution,
      maxConcurrent,
      fallbackEnabled: true,
    };

    try {
      const team = this.registry.createSquad(config);
      console.log(chalk.green("\n✅ Squad created successfully!\n"));
      console.log(PokemonUI.renderTeam(team));
    } catch (error) {
      console.error(
        chalk.red("\n❌ Error creating squad:"),
        error instanceof Error ? error.message : error,
      );
    }
  }

  /**
   * View all agents
   */
  async viewAllAgents(): Promise<void> {
    const allAgents = this.registry.getAllAgents();

    if (allAgents.length === 0) {
      console.log(chalk.yellow("\n⚠️  No agents available in registry.\n"));
      return;
    }

    console.log(PokemonUI.renderAgentList(allAgents));

    const { viewDetails } = await inquirer.prompt([
      {
        type: "confirm",
        name: "viewDetails",
        message: "Would you like to view details of a specific agent?",
        default: false,
      },
    ]);

    if (viewDetails) {
      const { selectedAgent } = await inquirer.prompt([
        {
          type: "list",
          name: "selectedAgent",
          message: "Select an agent:",
          choices: allAgents.map((agent, index) => ({
            name: `${index + 1}. ${agent.pokemonAttributes.sprite} ${agent.name}`,
            value: agent.id,
          })),
        },
      ]);

      const agent = this.registry.getAgent(selectedAgent);
      if (agent) {
        console.log(PokemonUI.renderAgentCard(agent));
        console.log(PokemonUI.renderTaskSpecializations(agent));
        console.log(PokemonUI.renderEvolutionTree(agent));
      }
    }
  }

  /**
   * View all squads
   */
  async viewAllSquads(): Promise<void> {
    const allTeams = this.registry.getAllTeams();

    if (allTeams.length === 0) {
      console.log(chalk.yellow("\n⚠️  No squads available in registry.\n"));
      return;
    }

    console.log(chalk.bold.cyan("\n=== Available Squads ===\n"));

    for (const team of allTeams) {
      console.log(PokemonUI.renderTeam(team));
    }
  }

  /**
   * View registry statistics
   */
  viewStats(): void {
    const stats = this.registry.getStats();
    console.log(PokemonUI.renderStats(stats));
  }

  /**
   * Compare two agents
   */
  async compareAgents(): Promise<void> {
    const allAgents = this.registry.getAllAgents();

    if (allAgents.length < 2) {
      console.log(
        chalk.yellow("\n⚠️  Need at least 2 agents for comparison.\n"),
      );
      return;
    }

    const { agent1Id } = await inquirer.prompt([
      {
        type: "list",
        name: "agent1Id",
        message: "Select first agent:",
        choices: allAgents.map((agent) => ({
          name: `${agent.pokemonAttributes.sprite} ${agent.name} (${agent.tier})`,
          value: agent.id,
        })),
      },
    ]);

    const { agent2Id } = await inquirer.prompt([
      {
        type: "list",
        name: "agent2Id",
        message: "Select second agent:",
        choices: allAgents
          .filter((agent) => agent.id !== agent1Id)
          .map((agent) => ({
            name: `${agent.pokemonAttributes.sprite} ${agent.name} (${agent.tier})`,
            value: agent.id,
          })),
      },
    ]);

    const agent1 = this.registry.getAgent(agent1Id);
    const agent2 = this.registry.getAgent(agent2Id);

    if (agent1 && agent2) {
      console.log(PokemonUI.renderComparison(agent1, agent2));
    }
  }

  /**
   * Launch a squad
   */
  async launchSquad(teamId: string, task: LLMTask): Promise<void> {
    console.log(chalk.cyan("\n🚀 Launching squad...\n"));

    try {
      const results = await this.squadLauncher.launchSquad(teamId, {
        task,
        priority: 1,
      });

      console.log(chalk.bold.green("\n✅ Squad execution complete!\n"));
      console.log(chalk.bold("Results:"));

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

      console.log();
    } catch (error) {
      console.error(
        chalk.red("\n❌ Error launching squad:"),
        error instanceof Error ? error.message : error,
      );
    }
  }
}

/**
 * Start the interactive squad selector
 */
export async function startSquadSelector(): Promise<void> {
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

  const selector = new SquadSelector();
  await selector.showMainMenu();
}
