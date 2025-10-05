# @open-composer/agent-registry

Pokemon-style agent management for OpenComposer, following open-swe patterns for model configuration and provider systems.

## Overview

Agent registry package that extends Open SWE patterns with Pokemon-style agent selection and management. Features include:

- **Agent Schema**: Extends Open SWE's model selection patterns with Pokemon attributes
- **Provider Integration**: Uses existing MODEL_OPTIONS and provider configurations
- **State Management**: Follows withLangGraph patterns for agent registry state
- **Team Composition**: Multi-agent coordination using Open SWE task assignment patterns
- **Performance Tracking**: Integrates with ModelTokenData and usage analytics

## Features

### Pokemon-Style Agent System

- **Agent Evolution**: Based on MODEL_OPTIONS hierarchy (Haiku → Sonnet → Opus)
- **Type Effectiveness**: Using LLMTask specializations
- **Stat Calculation**: Based on model performance benchmarks
- **Team Composition**: Using Open SWE's coordination patterns
- **Visual Sprites**: Mapped to model providers and capabilities

### Agent Tiers

- **Starter**: Lightweight, fast models (Haiku, Nano, Mini)
- **Evolved**: Balanced, versatile models (Sonnet, GPT-5, Gemini Pro)
- **Legendary**: Powerful, advanced models (Opus, O1, Extended Thinking)

### Task Specializations

- 🧭 **Planner**: Strategic planning and task decomposition
- ⚡ **Programmer**: Code generation and implementation
- 🔍 **Reviewer**: Code review and quality assurance
- 🌊 **Router**: Request routing and classification
- 🌿 **Summarizer**: Content summarization and condensing

## Installation

```bash
bun add @open-composer/agent-registry
```

## Usage

### Basic Usage

```typescript
import { getAgentRegistry, AgentFactory } from '@open-composer/agent-registry';

// Get the global registry instance
const registry = getAgentRegistry();

// Create a custom agent
const agent = AgentFactory.createAgent(
  'claude-sonnet-4-0',
  'anthropic',
  ['planner', 'programmer'],
  'Custom Agent'
);

// Register the agent
registry.registerAgent(agent);

// Get agents by task
const plannerAgents = registry.getAgentsByTask('planner');

// Get registry statistics
const stats = registry.getStats();
console.log(stats);
```

### Squad Management

```typescript
import { getSquadLauncher } from '@open-composer/agent-registry';

const launcher = getSquadLauncher();

// Create a quick squad for a specific task
const team = launcher.createQuickSquad('programmer', 'My Coding Squad');

// Launch the squad
const results = await launcher.launchSquad(team.id, {
  task: 'programmer',
  priority: 1,
});

// Check results
for (const result of results) {
  console.log(`${result.agentName}: ${result.success ? 'Success' : 'Failed'}`);
  console.log(`Tokens: ${result.tokensUsed}, Latency: ${result.latency}ms`);
}
```

### Interactive UI

```typescript
import { startSquadSelector } from '@open-composer/agent-registry';

// Start interactive Pokemon-style UI
await startSquadSelector();
```

### CLI Usage

Squad management is available through the `open-composer` CLI:

```bash
# Start interactive mode
open-composer squad interactive

# Create a quick squad
open-composer squad quick programmer --name "Code Squad" --launch

# List all agents
open-composer squad list-agents

# Filter agents
open-composer squad list-agents --tier legendary
open-composer squad list-agents --provider anthropic
open-composer squad list-agents --task programmer

# Show agent details
open-composer squad show <agentId>

# Compare agents
open-composer squad compare <agent1Id> <agent2Id>

# View registry stats
open-composer squad stats

# List all squads
open-composer squad list-squads

# Launch a squad
open-composer squad launch <squadId> <task>
```

For more detailed CLI documentation, see the main [open-composer CLI documentation](../../apps/cli/README.md).

## API Reference

### Core Types

```typescript
export interface OpenComposerAgent {
  id: string;
  name: string;
  modelName: string;
  provider: Provider;
  tier: 'starter' | 'evolved' | 'legendary';
  taskSpecializations: LLMTask[];
  pokemonAttributes: PokemonAttributes;
  compatibility: ModelCompatibility;
  description: string;
  createdAt: Date;
  performance: AgentPerformance;
}

export interface AgentTeam {
  id: string;
  name: string;
  description: string;
  agents: OpenComposerAgent[];
  createdAt: Date;
  config?: TeamConfig;
}

export interface SquadConfig {
  name: string;
  description: string;
  agentIds: string[];
  taskDistribution: 'round-robin' | 'specialized' | 'balanced';
  maxConcurrent: number;
  fallbackEnabled: boolean;
}
```

### Agent Factory

```typescript
class AgentFactory {
  static createAgent(
    modelName: string,
    provider: Provider,
    tasks: LLMTask[],
    customName?: string
  ): OpenComposerAgent;

  static createDefaultAgents(): OpenComposerAgent[];
}
```

### Agent Registry

```typescript
class AgentRegistry {
  registerAgent(agent: OpenComposerAgent): void;
  getAgent(id: string): OpenComposerAgent | undefined;
  getAllAgents(): OpenComposerAgent[];
  getAgentsByTask(task: LLMTask): OpenComposerAgent[];
  getAgentsByProvider(provider: Provider): OpenComposerAgent[];
  getAgentsByTier(tier: AgentTier): OpenComposerAgent[];

  createTeam(name: string, description: string, agentIds: string[], config?: TeamConfig): AgentTeam;
  createSquad(squadConfig: SquadConfig): AgentTeam;

  updateAgentPerformance(agentId: string, metrics: PerformanceMetrics): void;
  getStats(): RegistryStats;
}
```

### Squad Launcher

```typescript
class SquadLauncher {
  async launchSquad(teamId: string, context: SquadExecutionContext): Promise<SquadExecutionResult[]>;
  getRecommendedAgents(task: LLMTask, count?: number): OpenComposerAgent[];
  createQuickSquad(task: LLMTask, squadName?: string): AgentTeam;
}
```

## Integration with Open SWE

This package integrates seamlessly with open-swe patterns:

### Model Configuration

```typescript
// Extends MODEL_OPTIONS with Pokemon attributes
const agent = AgentFactory.createAgent(
  'claude-sonnet-4-0',  // From TASK_TO_CONFIG_DEFAULTS_MAP
  'anthropic',           // From PROVIDER_FALLBACK_ORDER
  [LLMTask.PROGRAMMER],  // From LLMTask enum
);
```

### Provider System

```typescript
// Uses open-swe provider configurations
const PROVIDER_FALLBACK_ORDER = ['openai', 'anthropic', 'google-genai'] as const;
```

### Task Assignment

```typescript
// Follows LLMTask patterns for specialization
enum LLMTask {
  PLANNER = 'planner',
  PROGRAMMER = 'programmer',
  REVIEWER = 'reviewer',
  ROUTER = 'router',
  SUMMARIZER = 'summarizer',
}
```

## Development

```bash
# Install dependencies
bun install

# Build
bun run build

# Type check
bun run type-check

# Lint
bun run lint

# Run squad CLI
bun run squad
```

## License

MIT
