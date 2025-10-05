import inquirer from "inquirer";
import type { LLMTask } from "@open-composer/agent-registry";
import { getAgentRegistry, getSquadLauncher } from "@open-composer/agent-registry";

/**
 * Start interactive squad selector
 */
export async function startSquadSelector(): Promise<void> {
  const registry = getAgentRegistry();
  const launcher = getSquadLauncher();

  console.log("\n🎮 Pokemon-Style Squad Manager\n");

  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
      choices: [
        { name: "📋 List all agents", value: "list" },
        { name: "✨ Create new squad", value: "create" },
        { name: "🚀 Quick squad (by task)", value: "quick" },
        { name: "📊 View statistics", value: "stats" },
        { name: "🚪 Exit", value: "exit" },
      ],
    },
  ]);

  switch (action) {
    case "list": {
      const agents = registry.getAllAgents();
      console.log(`\n📦 Found ${agents.length} agents:\n`);
      for (const agent of agents) {
        console.log(
          `  ${agent.pokemonAttributes.sprite} ${agent.name} (${agent.tier}) - ${agent.provider}`,
        );
      }
      break;
    }

    case "create": {
      console.log("\n🛠️  Create Squad - Not implemented in CLI yet");
      console.log("   Use the interactive UI components for full squad creation");
      break;
    }

    case "quick": {
      const { task } = await inquirer.prompt([
        {
          type: "list",
          name: "task",
          message: "Select task specialization:",
          choices: [
            { name: "🧭 Planner", value: "planner" },
            { name: "⚡ Programmer", value: "programmer" },
            { name: "🔍 Reviewer", value: "reviewer" },
            { name: "🌊 Router", value: "router" },
            { name: "🌿 Summarizer", value: "summarizer" },
          ],
        },
      ]);

      const team = launcher.createQuickSquad(task as LLMTask);
      console.log(`\n✅ Created squad: ${team.name}`);
      console.log(`   Agents: ${team.agents.map((a) => a.name).join(", ")}`);
      break;
    }

    case "stats": {
      const stats = registry.getStats();
      console.log("\n📊 Registry Statistics:");
      console.log(`   Total Agents: ${stats.totalAgents}`);
      console.log(`   Total Squads: ${stats.totalTeams}`);
      console.log(`   Starter: ${stats.tierCounts.starter || 0}`);
      console.log(`   Evolved: ${stats.tierCounts.evolved || 0}`);
      console.log(`   Legendary: ${stats.tierCounts.legendary || 0}`);
      break;
    }

    case "exit":
      console.log("\n👋 Goodbye!\n");
      return;
  }

  // Loop back to main menu
  await startSquadSelector();
}
