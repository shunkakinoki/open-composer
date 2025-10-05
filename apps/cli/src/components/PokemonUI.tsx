import { Box, Text } from "ink";
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
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
      <Box justifyContent="space-between">
        <Text>
          {sprite} <Text color={tierColor} bold>{name}</Text>
        </Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Box>
          <Text color="cyan">Type: </Text>
          <Text>{type}</Text>
        </Box>
        <Box>
          <Text color="cyan">Tier: </Text>
          <Text color={tierColor}>{tier}</Text>
        </Box>
        <Box>
          <Text color="cyan">Provider: </Text>
          <Text>{provider}</Text>
        </Box>
        <Box>
          <Text color="cyan">Model: </Text>
          <Text>{modelName}</Text>
        </Box>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text bold>Stats</Text>
        <StatBar label="Speed" value={stats.speed} />
        <StatBar label="Accuracy" value={stats.accuracy} />
        <StatBar label="Power" value={stats.power} />
        <StatBar label="Efficiency" value={stats.efficiency} />
        <StatBar label="Versatility" value={stats.versatility} />
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text bold>Performance</Text>
        <Box>
          <Text color="cyan">Requests: </Text>
          <Text>{performance.totalRequests}</Text>
        </Box>
        <Box>
          <Text color="cyan">Tokens: </Text>
          <Text>{performance.totalTokensUsed}</Text>
        </Box>
        <Box>
          <Text color="cyan">Success: </Text>
          <Text>{performance.successRate.toFixed(1)}%</Text>
        </Box>
        <Box>
          <Text color="cyan">Latency: </Text>
          <Text>{performance.averageLatency.toFixed(0)}ms</Text>
        </Box>
      </Box>

      {(evolvesFrom || evolvesTo) && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="gray">Evolution:</Text>
          <Box>
            {evolvesFrom && <Text color="gray">← {evolvesFrom} </Text>}
            {evolvesTo && <Text color="gray">→ {evolvesTo}</Text>}
          </Box>
        </Box>
      )}
    </Box>
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
    <Box>
      <Text>{label.padEnd(12)} </Text>
      <Text color="green">{"█".repeat(filled)}</Text>
      <Text color="gray">{"░".repeat(empty)}</Text>
      <Text> {value.toString().padStart(3)}</Text>
    </Box>
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
    <Box flexDirection="column">
      <Box>
        <Text bold>
          {"#".padEnd(4)}{"Name".padEnd(25)}{"Type".padEnd(20)}{"Tier".padEnd(15)}{"Provider".padEnd(15)}
        </Text>
      </Box>
      <Box>
        <Text color="gray">{"─".repeat(79)}</Text>
      </Box>
      {agents.map((agent, index) => {
        const tierColor = agent.tier === "legendary" ? "yellow" : agent.tier === "evolved" ? "blue" : "green";
        return (
          <Box key={agent.id}>
            <Text>{(index + 1).toString().padEnd(4)}</Text>
            <Text>{agent.pokemonAttributes.sprite} {agent.name.padEnd(23)}</Text>
            <Text>{agent.pokemonAttributes.type.padEnd(20)}</Text>
            <Text color={tierColor}>{agent.tier.padEnd(15)}</Text>
            <Text>{agent.provider.padEnd(15)}</Text>
          </Box>
        );
      })}
    </Box>
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
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
      <Box flexDirection="column">
        <Text bold color="cyan">SQUAD: {name}</Text>
        <Text color="gray">{description.slice(0, 50)}</Text>
      </Box>

      {config && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="cyan">Configuration:</Text>
          <Box marginLeft={2}>
            <Text>Max Concurrent: {config.maxConcurrent}</Text>
          </Box>
          {config.taskDistribution && (
            <Box marginLeft={2}>
              <Text>Task Distribution: {config.taskDistribution}</Text>
            </Box>
          )}
          <Box marginLeft={2}>
            <Text>Fallback: {config.fallbackEnabled.toString()}</Text>
          </Box>
        </Box>
      )}

      <Box flexDirection="column" marginTop={1}>
        {agents.map((agent, i) => (
          <Box key={agent.id} flexDirection="column">
            <Box>
              <Text>{i + 1}. {agent.pokemonAttributes.sprite} {agent.name}</Text>
            </Box>
            <Box marginLeft={3}>
              <Text color="gray">{agent.tier} | {agent.provider} | {agent.modelName}</Text>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
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
    <Box flexDirection="column">
      <Text bold color="cyan">Evolution Tree for {name}:</Text>
      <Box flexDirection="column" marginTop={1} marginLeft={2}>
        {evolvesFrom && (
          <>
            <Text color="gray">{evolvesFrom}</Text>
            <Text color="gray">  ↓</Text>
          </>
        )}
        <Text bold color="green">{name} {pokemonAttributes.sprite}</Text>
        {evolvesTo && (
          <>
            <Text color="gray">  ↓</Text>
            <Text color="yellow">{evolvesTo}</Text>
          </>
        )}
      </Box>
    </Box>
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
    <Box flexDirection="column">
      <Text bold color="cyan">Task Specializations for {agent.name}:</Text>
      <Box flexDirection="column" marginTop={1} marginLeft={2}>
        {agent.taskSpecializations.map((task) => (
          <Box key={task}>
            <Text>{taskIcons[task] || "📋"} </Text>
            <Text color="green">{task}</Text>
          </Box>
        ))}
      </Box>
    </Box>
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
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
      <Text bold color="cyan">Agent Registry Statistics</Text>

      <Box flexDirection="column" marginTop={1}>
        <Box>
          <Text color="cyan">Total Agents: </Text>
          <Text>{stats.totalAgents}</Text>
        </Box>
        <Box>
          <Text color="cyan">Total Squads: </Text>
          <Text>{stats.totalTeams}</Text>
        </Box>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text bold>Tiers</Text>
        <Box marginLeft={2}>
          <Text>Starter: {stats.tierCounts.starter || 0}</Text>
        </Box>
        <Box marginLeft={2}>
          <Text>Evolved: {stats.tierCounts.evolved || 0}</Text>
        </Box>
        <Box marginLeft={2}>
          <Text>Legendary: {stats.tierCounts.legendary || 0}</Text>
        </Box>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text bold>Performance</Text>
        <Box>
          <Text color="cyan">Total Requests: </Text>
          <Text>{stats.totalRequests}</Text>
        </Box>
        <Box>
          <Text color="cyan">Total Tokens: </Text>
          <Text>{stats.totalTokensUsed}</Text>
        </Box>
        <Box>
          <Text color="cyan">Avg Success: </Text>
          <Text>{stats.averageSuccessRate.toFixed(1)}%</Text>
        </Box>
      </Box>
    </Box>
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
      <Box>
        <Text>{label.padEnd(15)} </Text>
        <Text color={color1}>{val1.toString().padStart(3)}</Text>
        <Text color="gray"> vs </Text>
        <Text color={color2}>{val2.toString().padStart(3)}</Text>
      </Box>
    );
  };

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">Agent Comparison: {agent1.name} vs {agent2.name}</Text>
      <Box flexDirection="column" marginTop={1} marginLeft={2}>
        <ComparisonRow label="Speed" val1={stats1.speed} val2={stats2.speed} />
        <ComparisonRow label="Accuracy" val1={stats1.accuracy} val2={stats2.accuracy} />
        <ComparisonRow label="Power" val1={stats1.power} val2={stats2.power} />
        <ComparisonRow label="Efficiency" val1={stats1.efficiency} val2={stats2.efficiency} />
        <ComparisonRow label="Versatility" val1={stats1.versatility} val2={stats2.versatility} />
      </Box>
    </Box>
  );
};
