import { TextAttributes } from "@opentui/core"; 
import type React from "react";
import type { AgentTeam, OpenComposerAgent } from "@open-composer/agent-registry";

// -----------------------------------------------------------------------------
// Agent Card
// -----------------------------------------------------------------------------

interface AgentCardProps {
  agent: OpenComposerAgent;
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent }) => {
  const { name, tier, pokemonAttributes, provider, modelName, performance } = agent;
  const { sprite, stats, type, evolvesFrom, evolvesTo } = pokemonAttributes;

  const tierColor = tier === "legendary" ? "yellow" : tier === "evolved" ? "blue" : "green";

  return (
    <box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
      <box justifyContent="space-between">
        <text content={`${sprite} ${name}`} style={{ fg: tierColor, attributes: TextAttributes.BOLD }} />
      </box>

      <box flexDirection="column" marginTop={1}>
        <box>
          <text content="Type: " style={{ fg: "cyan" }} />
          <text content={type} />
        </box>
        <box>
          <text content="Tier: " style={{ fg: "cyan" }} />
          <text content={tier} style={{ fg: tierColor }} />
        </box>
        <box>
          <text content="Provider: " style={{ fg: "cyan" }} />
          <text content={provider} />
        </box>
        <box>
          <text content="Model: " style={{ fg: "cyan" }} />
          <text content={modelName} />
        </box>
      </box>

      <box flexDirection="column" marginTop={1}>
        <text content="Stats" style={{ attributes: TextAttributes.BOLD }} />
        <StatBar label="Speed" value={stats.speed} />
        <StatBar label="Accuracy" value={stats.accuracy} />
        <StatBar label="Power" value={stats.power} />
        <StatBar label="Efficiency" value={stats.efficiency} />
        <StatBar label="Versatility" value={stats.versatility} />
      </box>

      <box flexDirection="column" marginTop={1}>
        <text content="Performance" style={{ attributes: TextAttributes.BOLD }} />
        <box>
          <text content="Requests: " style={{ fg: "cyan" }} />
          <text content={performance.totalRequests} />
        </box>
        <box>
          <text content="Tokens: " style={{ fg: "cyan" }} />
          <text content={performance.totalTokensUsed} />
        </box>
        <box>
          <text content="Success: " style={{ fg: "cyan" }} />
          <text content={`${performance.successRate.toFixed(1)}%`} />
        </box>
        <box>
          <text content="Latency: " style={{ fg: "cyan" }} />
          <text content={`${performance.averageLatency.toFixed(0)}ms`} />
        </box>
      </box>

      {(evolvesFrom || evolvesTo) && (
        <box flexDirection="column" marginTop={1}>
          <text content="Evolution:" style={{ fg: "gray" }} />
          <box>
            {evolvesFrom && <text content={`← ${evolvesFrom} `} style={{ fg: "gray" }} />}
            {evolvesTo && <text content={`→ ${evolvesTo}`} style={{ fg: "gray" }} />}
          </box>
        </box>
      )}
    </box>
  );
};

// -----------------------------------------------------------------------------
// Stat Bar
// -----------------------------------------------------------------------------

interface StatBarProps {
  label: string;
  value: number;
}

const StatBar: React.FC<StatBarProps> = ({ label, value }) => {
  const barLength = 20;
  const filled = Math.round((value / 100) * barLength);
  const empty = barLength - filled;

  return (
    <box>
      <text content={`${label.padEnd(12)} `} />
      <text content={"█".repeat(filled)} style={{ fg: "green" }} />
      <text content={"░".repeat(empty)} style={{ fg: "gray" }} />
      <text content={` ${value.toString().padStart(3)}`} />
    </box>
  );
};

// -----------------------------------------------------------------------------
// Agent List
// -----------------------------------------------------------------------------

interface AgentListProps {
  agents: OpenComposerAgent[];
}

export const AgentList: React.FC<AgentListProps> = ({ agents }) => {
  return (
    <box flexDirection="column">
      <box>
        <text
          content={`${"#".padEnd(4)}${"Name".padEnd(25)}${"Type".padEnd(20)}${"Tier".padEnd(15)}${"Provider".padEnd(15)}`}
          style={{ attributes: TextAttributes.BOLD }}
        />
      </box>
      <box>
        <text content={"─".repeat(79)} style={{ fg: "gray" }} />
      </box>
      {agents.map((agent, index) => {
        const tierColor = agent.tier === "legendary" ? "yellow" : agent.tier === "evolved" ? "blue" : "green";
        return (
          <box key={agent.id}>
            <text content={(index + 1).toString().padEnd(4)} />
            <text content={`${agent.pokemonAttributes.sprite} ${agent.name.padEnd(23)}`} />
            <text content={agent.pokemonAttributes.type.padEnd(20)} />
            <text content={agent.tier.padEnd(15)} style={{ fg: tierColor }} />
            <text content={agent.provider.padEnd(15)} />
          </box>
        );
      })}
    </box>
  );
};

// -----------------------------------------------------------------------------
// Team Display
// -----------------------------------------------------------------------------

interface TeamDisplayProps {
  team: AgentTeam;
}

export const TeamDisplay: React.FC<TeamDisplayProps> = ({ team }) => {
  const { name, description, agents, config } = team;

  return (
    <box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
      <box flexDirection="column">
        <text content={`SQUAD: ${name}`} style={{ fg: "cyan", attributes: TextAttributes.BOLD }} />
        <text content={description.slice(0, 50)} style={{ fg: "gray" }} />
      </box>

      {config && (
        <box flexDirection="column" marginTop={1}>
          <text content="Configuration:" style={{ fg: "cyan" }} />
          <box marginLeft={2}>
            <text content={`Max Concurrent: ${config.maxConcurrent}`} />
          </box>
          {config.taskDistribution && (
            <box marginLeft={2}>
              <text content={`Task Distribution: ${config.taskDistribution}`} />
            </box>
          )}
          <box marginLeft={2}>
            <text content={`Fallback: ${config.fallbackEnabled.toString()}`} />
          </box>
        </box>
      )}

      <box flexDirection="column" marginTop={1}>
        {agents.map((agent, i) => (
          <box key={agent.id} flexDirection="column">
            <box>
              <text content={`${i + 1}. ${agent.pokemonAttributes.sprite} ${agent.name}`} />
            </box>
            <box marginLeft={3}>
              <text content={`${agent.tier} | ${agent.provider} | ${agent.modelName}`} style={{ fg: "gray" }} />
            </box>
          </box>
        ))}
      </box>
    </box>
  );
};

// -----------------------------------------------------------------------------
// Evolution Tree
// -----------------------------------------------------------------------------

interface EvolutionTreeProps {
  agent: OpenComposerAgent;
}

export const EvolutionTree: React.FC<EvolutionTreeProps> = ({ agent }) => {
  const { name, pokemonAttributes } = agent;
  const { evolvesFrom, evolvesTo } = pokemonAttributes;

  return (
    <box flexDirection="column">
      <text content={`Evolution Tree for ${name}:`} style={{ fg: "cyan", attributes: TextAttributes.BOLD }} />
      <box flexDirection="column" marginTop={1} marginLeft={2}>
        {evolvesFrom && (
          <>
            <text content={evolvesFrom} style={{ fg: "gray" }} />
            <text content="  ↓" style={{ fg: "gray" }} />
          </>
        )}
        <text content={`${name} ${pokemonAttributes.sprite}`} style={{ fg: "green", attributes: TextAttributes.BOLD }} />
        {evolvesTo && (
          <>
            <text content="  ↓" style={{ fg: "gray" }} />
            <text content={evolvesTo} style={{ fg: "yellow" }} />
          </>
        )}
      </box>
    </box>
  );
};

// -----------------------------------------------------------------------------
// Task Specializations
// -----------------------------------------------------------------------------

interface TaskSpecializationsProps {
  agent: OpenComposerAgent;
}

export const TaskSpecializations: React.FC<TaskSpecializationsProps> = ({ agent }) => {
  const taskIcons: Record<string, string> = {
    planner: "🧭",
    programmer: "⚡",
    reviewer: "🔍",
    router: "🌊",
    summarizer: "🌿",
  };

  return (
    <box flexDirection="column">
      <text content={`Task Specializations for ${agent.name}:`} style={{ fg: "cyan", attributes: TextAttributes.BOLD }} />
      <box flexDirection="column" marginTop={1} marginLeft={2}>
        {agent.taskSpecializations.map((task) => (
          <box key={task}>
            <text content={`${taskIcons[task] || "📋"} `} />
            <text content={task} style={{ fg: "green" }} />
          </box>
        ))}
      </box>
    </box>
  );
};

// -----------------------------------------------------------------------------
// Registry Stats
// -----------------------------------------------------------------------------

interface RegistryStatsProps {
  stats: {
    totalAgents: number;
    totalTeams: number;
    tierCounts: Record<string, number>;
    providerCounts: Record<string, number>;
    totalTokensUsed: number;
    totalRequests: number;
    averageSuccessRate: number;
  };
}

export const RegistryStats: React.FC<RegistryStatsProps> = ({ stats }) => {
  return (
    <box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
      <text content="Agent Registry Statistics" style={{ fg: "cyan", attributes: TextAttributes.BOLD }} />

      <box flexDirection="column" marginTop={1}>
        <box>
          <text content="Total Agents: " style={{ fg: "cyan" }} />
          <text content={stats.totalAgents} />
        </box>
        <box>
          <text content="Total Squads: " style={{ fg: "cyan" }} />
          <text content={stats.totalTeams} />
        </box>
      </box>

      <box flexDirection="column" marginTop={1}>
        <text content="Tiers" style={{ attributes: TextAttributes.BOLD }} />
        <box marginLeft={2}>
          <text content={`Starter: ${stats.tierCounts.starter || 0}`} />
        </box>
        <box marginLeft={2}>
          <text content={`Evolved: ${stats.tierCounts.evolved || 0}`} />
        </box>
        <box marginLeft={2}>
          <text content={`Legendary: ${stats.tierCounts.legendary || 0}`} />
        </box>
      </box>

      <box flexDirection="column" marginTop={1}>
        <text content="Performance" style={{ attributes: TextAttributes.BOLD }} />
        <box>
          <text content="Total Requests: " style={{ fg: "cyan" }} />
          <text content={stats.totalRequests} />
        </box>
        <box>
          <text content="Total Tokens: " style={{ fg: "cyan" }} />
          <text content={stats.totalTokensUsed} />
        </box>
        <box>
          <text content="Avg Success: " style={{ fg: "cyan" }} />
          <text content={`${stats.averageSuccessRate.toFixed(1)}%`} />
        </box>
      </box>
    </box>
  );
};

// -----------------------------------------------------------------------------
// Agent Comparison
// -----------------------------------------------------------------------------

interface AgentComparisonProps {
  agent1: OpenComposerAgent;
  agent2: OpenComposerAgent;
}

export const AgentComparison: React.FC<AgentComparisonProps> = ({ agent1, agent2 }) => {
  const stats1 = agent1.pokemonAttributes.stats;
  const stats2 = agent2.pokemonAttributes.stats;

  const ComparisonRow: React.FC<{ label: string; val1: number; val2: number }> = ({ label, val1, val2 }) => {
    const color1 = val1 > val2 ? "green" : val1 < val2 ? "red" : "yellow";
    const color2 = val2 > val1 ? "green" : val2 < val1 ? "red" : "yellow";

    return (
      <box>
        <text content={`${label.padEnd(15)} `} />
        <text content={val1.toString().padStart(3)} style={{ fg: color1 }} />
        <text content=" vs " style={{ fg: "gray" }} />
        <text content={val2.toString().padStart(3)} style={{ fg: color2 }} />
      </box>
    );
  };

  return (
    <box flexDirection="column">
      <text content={`Agent Comparison: ${agent1.name} vs ${agent2.name}`} style={{ fg: "cyan", attributes: TextAttributes.BOLD }} />
      <box flexDirection="column" marginTop={1} marginLeft={2}>
        <ComparisonRow label="Speed" val1={stats1.speed} val2={stats2.speed} />
        <ComparisonRow label="Accuracy" val1={stats1.accuracy} val2={stats2.accuracy} />
        <ComparisonRow label="Power" val1={stats1.power} val2={stats2.power} />
        <ComparisonRow label="Efficiency" val1={stats1.efficiency} val2={stats2.efficiency} />
        <ComparisonRow label="Versatility" val1={stats1.versatility} val2={stats2.versatility} />
      </box>
    </box>
  );
};
