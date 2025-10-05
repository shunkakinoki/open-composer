import { expect, test } from "bun:test";
import {
  AgentCard,
  AgentComparison,
  AgentList,
  EvolutionTree,
  RegistryStats,
  TaskSpecializations,
  TeamDisplay,
} from "../../src/components/PokemonUI.js";
import { render } from "../utils.js";
import type {
  AgentTeam,
  OpenComposerAgent,
} from "@open-composer/agent-registry";
import { LLMTask } from "@open-composer/agent-registry";

// -----------------------------------------------------------------------------
// Mock Data
// -----------------------------------------------------------------------------

const mockAgent: OpenComposerAgent = {
  id: "test-agent-1",
  name: "Claude Sonnet",
  modelName: "claude-sonnet-4",
  provider: "anthropic",
  tier: "evolved",
  taskSpecializations: [LLMTask.PROGRAMMER, LLMTask.REVIEWER],
  pokemonAttributes: {
    sprite: "🤖",
    stats: {
      speed: 85,
      accuracy: 90,
      power: 88,
      efficiency: 92,
      versatility: 87,
    },
    type: "AI/Code",
    evolvesFrom: "Claude Haiku",
    evolvesTo: "Claude Opus",
  },
  compatibility: {
    supportedTasks: [LLMTask.PROGRAMMER, LLMTask.REVIEWER],
    supportsStreaming: true,
    supportsThinking: false,
    maxTokens: 200000,
  },
  description: "Balanced AI agent for coding tasks",
  createdAt: new Date("2024-01-01"),
  performance: {
    totalRequests: 100,
    totalTokensUsed: 50000,
    averageLatency: 1200,
    successRate: 95.0,
  },
};

const mockLegendaryAgent: OpenComposerAgent = {
  ...mockAgent,
  id: "test-agent-2",
  name: "Claude Opus",
  modelName: "claude-opus-4",
  tier: "legendary",
  pokemonAttributes: {
    ...mockAgent.pokemonAttributes,
    sprite: "💎",
    stats: {
      speed: 95,
      accuracy: 98,
      power: 99,
      efficiency: 85,
      versatility: 96,
    },
    evolvesFrom: "Claude Sonnet",
    evolvesTo: undefined,
  },
};

const mockStarterAgent: OpenComposerAgent = {
  ...mockAgent,
  id: "test-agent-3",
  name: "Claude Haiku",
  modelName: "claude-haiku-4",
  tier: "starter",
  pokemonAttributes: {
    ...mockAgent.pokemonAttributes,
    sprite: "⚡",
    stats: {
      speed: 98,
      accuracy: 75,
      power: 65,
      efficiency: 95,
      versatility: 70,
    },
    evolvesFrom: undefined,
    evolvesTo: "Claude Sonnet",
  },
};

const mockTeam: AgentTeam = {
  id: "test-team-1",
  name: "Elite Coding Squad",
  description: "High-performance team for complex coding tasks",
  agents: [mockAgent, mockLegendaryAgent],
  createdAt: new Date("2024-01-01"),
  config: {
    maxConcurrent: 3,
    taskDistribution: "balanced",
    fallbackEnabled: true,
  },
};

const mockStats = {
  totalAgents: 15,
  totalTeams: 5,
  tierCounts: {
    starter: 6,
    evolved: 6,
    legendary: 3,
  },
  providerCounts: {
    anthropic: 9,
    openai: 4,
    "google-genai": 2,
  },
  totalTokensUsed: 1500000,
  totalRequests: 500,
  averageSuccessRate: 94.5,
};

// -----------------------------------------------------------------------------
// AgentCard Tests
// -----------------------------------------------------------------------------

test("AgentCard renders agent details", () => {
  const { lastFrame } = render(<AgentCard agent={mockAgent} />);
  const output = lastFrame();

  expect(output).toContain("Claude Sonnet");
  expect(output).toContain("AI/Code");
  expect(output).toContain("evolved");
  expect(output).toContain("anthropic");
  expect(output).toContain("claude-sonnet-4");
});

test("AgentCard renders stats correctly", () => {
  const { lastFrame } = render(<AgentCard agent={mockAgent} />);
  const output = lastFrame();

  expect(output).toContain("Speed");
  expect(output).toContain("Accuracy");
  expect(output).toContain("Power");
  expect(output).toContain("Efficiency");
  expect(output).toContain("Versatility");
  expect(output).toContain("85");
  expect(output).toContain("90");
  expect(output).toContain("88");
  expect(output).toContain("92");
  expect(output).toContain("87");
});

test("AgentCard renders performance metrics", () => {
  const { lastFrame } = render(<AgentCard agent={mockAgent} />);
  const output = lastFrame();

  expect(output).toContain("Requests");
  expect(output).toContain("100");
  expect(output).toContain("Tokens");
  expect(output).toContain("50000");
  expect(output).toContain("Success");
  expect(output).toContain("95.0");
  expect(output).toContain("Latency");
  expect(output).toContain("1200");
});

test("AgentCard renders evolution information", () => {
  const { lastFrame } = render(<AgentCard agent={mockAgent} />);
  const output = lastFrame();

  expect(output).toContain("Evolution");
  expect(output).toContain("Claude Haiku");
  expect(output).toContain("Claude Opus");
});

test("AgentCard matches snapshot for evolved tier", () => {
  const { lastFrame } = render(<AgentCard agent={mockAgent} />);
  expect(lastFrame()).toMatchSnapshot();
});

test("AgentCard matches snapshot for legendary tier", () => {
  const { lastFrame } = render(<AgentCard agent={mockLegendaryAgent} />);
  expect(lastFrame()).toMatchSnapshot();
});

test("AgentCard matches snapshot for starter tier", () => {
  const { lastFrame } = render(<AgentCard agent={mockStarterAgent} />);
  expect(lastFrame()).toMatchSnapshot();
});

// -----------------------------------------------------------------------------
// AgentList Tests
// -----------------------------------------------------------------------------

test("AgentList renders multiple agents", () => {
  const { lastFrame } = render(
    <AgentList agents={[mockAgent, mockLegendaryAgent, mockStarterAgent]} />,
  );
  const output = lastFrame();

  expect(output).toContain("Claude Sonnet");
  expect(output).toContain("Claude Opus");
  expect(output).toContain("Claude Haiku");
});

test("AgentList renders table headers", () => {
  const { lastFrame } = render(<AgentList agents={[mockAgent]} />);
  const output = lastFrame();

  expect(output).toContain("#");
  expect(output).toContain("Name");
  expect(output).toContain("Type");
  expect(output).toContain("Tier");
  expect(output).toContain("Provider");
});

test("AgentList renders with correct numbering", () => {
  const { lastFrame } = render(
    <AgentList agents={[mockAgent, mockLegendaryAgent]} />,
  );
  const output = lastFrame();

  expect(output).toContain("1");
  expect(output).toContain("2");
});

test("AgentList matches snapshot", () => {
  const { lastFrame } = render(
    <AgentList agents={[mockAgent, mockLegendaryAgent, mockStarterAgent]} />,
  );
  expect(lastFrame()).toMatchSnapshot();
});

test("AgentList matches snapshot with empty list", () => {
  const { lastFrame } = render(<AgentList agents={[]} />);
  expect(lastFrame()).toMatchSnapshot();
});

// -----------------------------------------------------------------------------
// TeamDisplay Tests
// -----------------------------------------------------------------------------

test("TeamDisplay renders team information", () => {
  const { lastFrame } = render(<TeamDisplay team={mockTeam} />);
  const output = lastFrame();

  expect(output).toContain("Elite Coding Squad");
  expect(output).toContain("High-performance team");
});

test("TeamDisplay renders team configuration", () => {
  const { lastFrame } = render(<TeamDisplay team={mockTeam} />);
  const output = lastFrame();

  expect(output).toContain("Configuration");
  expect(output).toContain("Max Concurrent");
  expect(output).toContain("3");
  expect(output).toContain("Task Distribution");
  expect(output).toContain("balanced");
  expect(output).toContain("Fallback");
  expect(output).toContain("true");
});

test("TeamDisplay renders agent members", () => {
  const { lastFrame } = render(<TeamDisplay team={mockTeam} />);
  const output = lastFrame();

  expect(output).toContain("Claude Sonnet");
  expect(output).toContain("Claude Opus");
  expect(output).toContain("evolved");
  expect(output).toContain("legendary");
});

test("TeamDisplay matches snapshot", () => {
  const { lastFrame } = render(<TeamDisplay team={mockTeam} />);
  expect(lastFrame()).toMatchSnapshot();
});

test("TeamDisplay matches snapshot without config", () => {
  const teamWithoutConfig = { ...mockTeam, config: undefined };
  const { lastFrame } = render(<TeamDisplay team={teamWithoutConfig} />);
  expect(lastFrame()).toMatchSnapshot();
});

// -----------------------------------------------------------------------------
// EvolutionTree Tests
// -----------------------------------------------------------------------------

test("EvolutionTree renders evolution chain", () => {
  const { lastFrame } = render(<EvolutionTree agent={mockAgent} />);
  const output = lastFrame();

  expect(output).toContain("Evolution Tree");
  expect(output).toContain("Claude Haiku");
  expect(output).toContain("Claude Sonnet");
  expect(output).toContain("Claude Opus");
});

test("EvolutionTree renders starter agent (no evolvesFrom)", () => {
  const { lastFrame } = render(<EvolutionTree agent={mockStarterAgent} />);
  const output = lastFrame();

  expect(output).toContain("Claude Haiku");
  expect(output).toContain("Claude Sonnet");
  expect(output).not.toContain("Claude Opus");
});

test("EvolutionTree renders legendary agent (no evolvesTo)", () => {
  const { lastFrame } = render(<EvolutionTree agent={mockLegendaryAgent} />);
  const output = lastFrame();

  expect(output).toContain("Claude Sonnet");
  expect(output).toContain("Claude Opus");
});

test("EvolutionTree matches snapshot", () => {
  const { lastFrame } = render(<EvolutionTree agent={mockAgent} />);
  expect(lastFrame()).toMatchSnapshot();
});

// -----------------------------------------------------------------------------
// TaskSpecializations Tests
// -----------------------------------------------------------------------------

test("TaskSpecializations renders task list", () => {
  const { lastFrame } = render(<TaskSpecializations agent={mockAgent} />);
  const output = lastFrame();

  expect(output).toContain("Task Specializations");
  expect(output).toContain("programmer");
  expect(output).toContain("reviewer");
  expect(output).toContain("⚡");
  expect(output).toContain("🔍");
});

test("TaskSpecializations matches snapshot", () => {
  const { lastFrame } = render(<TaskSpecializations agent={mockAgent} />);
  expect(lastFrame()).toMatchSnapshot();
});

// -----------------------------------------------------------------------------
// RegistryStats Tests
// -----------------------------------------------------------------------------

test("RegistryStats renders statistics", () => {
  const { lastFrame } = render(<RegistryStats stats={mockStats} />);
  const output = lastFrame();

  expect(output).toContain("Agent Registry Statistics");
  expect(output).toContain("Total Agents");
  expect(output).toContain("15");
  expect(output).toContain("Total Squads");
  expect(output).toContain("5");
});

test("RegistryStats renders tier counts", () => {
  const { lastFrame } = render(<RegistryStats stats={mockStats} />);
  const output = lastFrame();

  expect(output).toContain("Starter");
  expect(output).toContain("6");
  expect(output).toContain("Evolved");
  expect(output).toContain("Legendary");
  expect(output).toContain("3");
});

test("RegistryStats renders performance metrics", () => {
  const { lastFrame } = render(<RegistryStats stats={mockStats} />);
  const output = lastFrame();

  expect(output).toContain("Performance");
  expect(output).toContain("Total Requests");
  expect(output).toContain("500");
  expect(output).toContain("Total Tokens");
  expect(output).toContain("1500000");
  expect(output).toContain("Avg Success");
  expect(output).toContain("94.5");
});

test("RegistryStats matches snapshot", () => {
  const { lastFrame } = render(<RegistryStats stats={mockStats} />);
  expect(lastFrame()).toMatchSnapshot();
});

// -----------------------------------------------------------------------------
// AgentComparison Tests
// -----------------------------------------------------------------------------

test("AgentComparison renders comparison header", () => {
  const { lastFrame } = render(
    <AgentComparison agent1={mockAgent} agent2={mockLegendaryAgent} />,
  );
  const output = lastFrame();

  expect(output).toContain("Agent Comparison");
  expect(output).toContain("Claude Sonnet");
  expect(output).toContain("Claude Opus");
});

test("AgentComparison renders stat comparisons", () => {
  const { lastFrame } = render(
    <AgentComparison agent1={mockAgent} agent2={mockLegendaryAgent} />,
  );
  const output = lastFrame();

  expect(output).toContain("Speed");
  expect(output).toContain("85");
  expect(output).toContain("95");
  expect(output).toContain("vs");
  expect(output).toContain("Accuracy");
  expect(output).toContain("Power");
  expect(output).toContain("Efficiency");
  expect(output).toContain("Versatility");
});

test("AgentComparison matches snapshot", () => {
  const { lastFrame } = render(
    <AgentComparison agent1={mockAgent} agent2={mockLegendaryAgent} />,
  );
  expect(lastFrame()).toMatchSnapshot();
});

test("AgentComparison matches snapshot with equal stats", () => {
  const { lastFrame } = render(
    <AgentComparison agent1={mockAgent} agent2={mockAgent} />,
  );
  expect(lastFrame()).toMatchSnapshot();
});
