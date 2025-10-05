#!/usr/bin/env bun

/**
 * Example usage of @open-composer/agent-registry
 */

import {
  getAgentRegistry,
  getSquadLauncher,
  startSquadSelector,
  PokemonUI,
  LLMTask,
} from "../src/index.js";

// Example 1: Using the Agent Registry
function example1_BasicRegistry() {
  console.log("=== Example 1: Basic Registry Usage ===\n");

  const registry = getAgentRegistry();

  // Get all agents
  const allAgents = registry.getAllAgents();
  console.log(`Total agents: ${allAgents.length}\n`);

  // Get agents by task
  const programmers = registry.getAgentsByTask(LLMTask.PROGRAMMER);
  console.log(`Programmer agents: ${programmers.length}`);
  console.log(PokemonUI.renderAgentList(programmers));

  // Get registry stats
  const stats = registry.getStats();
  console.log(PokemonUI.renderStats(stats));
}

// Example 2: Creating Custom Squads
async function example2_CreateSquad() {
  console.log("\n=== Example 2: Creating Custom Squad ===\n");

  const launcher = getSquadLauncher();

  // Create a quick squad
  const team = launcher.createQuickSquad(LLMTask.PROGRAMMER, "Elite Coders");

  console.log(PokemonUI.renderTeam(team));

  // Launch the squad
  console.log("\n🚀 Launching squad...\n");
  const results = await launcher.launchSquad(team.id, {
    task: LLMTask.PROGRAMMER,
    priority: 1,
  });

  // Display results
  for (const result of results) {
    const status = result.success ? "✅" : "❌";
    console.log(`${status} ${result.agentName}`);
    console.log(`  Tokens: ${result.tokensUsed}, Latency: ${result.latency}ms`);
    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }
  }
}

// Example 3: Agent Comparison
function example3_CompareAgents() {
  console.log("\n=== Example 3: Comparing Agents ===\n");

  const registry = getAgentRegistry();
  const agents = registry.getAllAgents();

  if (agents.length >= 2) {
    const agent1 = agents[0];
    const agent2 = agents[1];

    console.log(PokemonUI.renderComparison(agent1, agent2));
  }
}

// Example 4: Custom Squad with Configuration
function example4_CustomSquadConfig() {
  console.log("\n=== Example 4: Custom Squad Configuration ===\n");

  const registry = getAgentRegistry();
  const agents = registry.getAllAgents();

  // Create a balanced team with custom config
  const team = registry.createSquad({
    name: "Balanced Team",
    description: "A well-balanced squad for general tasks",
    agentIds: agents.slice(0, 3).map((a) => a.id),
    taskDistribution: "balanced",
    maxConcurrent: 2,
    fallbackEnabled: true,
  });

  console.log(PokemonUI.renderTeam(team));
}

// Example 5: Interactive Mode
async function example5_Interactive() {
  console.log("\n=== Example 5: Interactive Mode ===\n");
  console.log("Starting interactive squad selector...\n");

  await startSquadSelector();
}

// Run examples
async function main() {
  const args = process.argv.slice(2);
  const example = args[0] || "1";

  switch (example) {
    case "1":
      example1_BasicRegistry();
      break;
    case "2":
      await example2_CreateSquad();
      break;
    case "3":
      example3_CompareAgents();
      break;
    case "4":
      example4_CustomSquadConfig();
      break;
    case "5":
      await example5_Interactive();
      break;
    case "all":
      example1_BasicRegistry();
      await example2_CreateSquad();
      example3_CompareAgents();
      example4_CustomSquadConfig();
      break;
    default:
      console.log("Usage: bun run examples/usage.ts [1|2|3|4|5|all]");
      console.log("\nExamples:");
      console.log("  1 - Basic Registry Usage");
      console.log("  2 - Creating Custom Squad");
      console.log("  3 - Comparing Agents");
      console.log("  4 - Custom Squad Configuration");
      console.log("  5 - Interactive Mode");
      console.log("  all - Run examples 1-4");
  }
}

main().catch(console.error);
