# Squad Command Documentation

## Overview

The `squad` command is a CLI tool for managing custom agent squads with Pokemon-style configuration. It provides both interactive and command-line interfaces for creating, managing, and launching agent teams based on open-swe patterns.

## Installation

```bash
# Install the package
bun add @open-composer/agent-registry

# Or install globally
bun install -g @open-composer/agent-registry
```

## Quick Start

```bash
# Start interactive mode (recommended for beginners)
squad interactive

# Create a quick squad for a specific task
squad quick programmer --name "Code Squad" --launch

# List all available agents
squad list-agents

# View registry statistics
squad stats
```

## Commands

### Interactive Mode

Launch the Pokemon-style interactive UI for squad management:

```bash
squad interactive
# or
squad i
```

Features:
- 🎯 Create Quick Squad
- 🏗️ Build Custom Squad
- 👥 View All Agents
- 🎖️ View All Squads
- 📊 View Registry Stats
- 🆚 Compare Agents

### Quick Squad

Create a squad optimized for a specific task:

```bash
squad quick <task> [options]

# Examples:
squad quick programmer
squad quick planner --name "Planning Team"
squad quick reviewer --launch
```

**Arguments:**
- `<task>` - Task type: `planner`, `programmer`, `reviewer`, `router`, or `summarizer`

**Options:**
- `-n, --name <name>` - Custom squad name
- `-l, --launch` - Launch squad immediately after creation

### List Agents

Display all available agents with optional filtering:

```bash
squad list-agents [options]

# Examples:
squad list-agents
squad list-agents --tier legendary
squad list-agents --provider anthropic
squad list-agents --task programmer
```

**Options:**
- `-t, --tier <tier>` - Filter by tier: `starter`, `evolved`, or `legendary`
- `-p, --provider <provider>` - Filter by provider: `anthropic`, `openai`, or `google-genai`
- `-k, --task <task>` - Filter by task specialization

### List Squads

Display all created squads:

```bash
squad list-squads
# or
squad ls
```

### Show Agent Details

Display detailed information about a specific agent:

```bash
squad show <agentId>

# Example:
squad show 550e8400-e29b-41d4-a716-446655440000
```

Shows:
- Agent card with stats
- Task specializations
- Evolution tree
- Performance metrics

### Compare Agents

Compare two agents side-by-side:

```bash
squad compare <agent1Id> <agent2Id>

# Example:
squad compare 550e8400-e29b-41d4-a716-446655440000 660f9500-f30c-52e5-b827-557766551111
```

### Registry Statistics

View overall registry statistics:

```bash
squad stats
```

Displays:
- Total agents and squads
- Tier distribution
- Provider distribution
- Performance metrics

### Launch Squad

Execute an existing squad for a task:

```bash
squad launch <squadId> <task>

# Example:
squad launch 770g0600-g40d-63f6-c938-668877662222 programmer
```

## Agent Tiers

### 🌱 Starter Tier
Fast, lightweight models optimized for speed and efficiency.

**Models:**
- Claude 3.5 Haiku
- GPT-5 Nano
- GPT-5 Mini

**Characteristics:**
- High speed (70-85 points)
- Good efficiency (65-80 points)
- Moderate power (40-55 points)

### ⚡ Evolved Tier
Balanced models for general-purpose tasks.

**Models:**
- Claude Sonnet 4.0
- GPT-5
- Gemini 2.5 Pro/Flash

**Characteristics:**
- Balanced stats (60-75 across all)
- High accuracy (65-80 points)
- Good versatility (65-75 points)

### 🌟 Legendary Tier
Powerful, advanced models for complex tasks.

**Models:**
- Claude Opus 4.0
- GPT-5 O1
- Extended Thinking Models

**Characteristics:**
- Highest power (80-95 points)
- Maximum accuracy (75-90 points)
- Lower speed (35-50 points)

## Task Specializations

### 🧭 Planner
Strategic planning and task decomposition.

**Best For:**
- Breaking down complex problems
- Creating execution plans
- Task prioritization

### ⚡ Programmer
Code generation and implementation.

**Best For:**
- Writing production code
- Implementing features
- Bug fixes

### 🔍 Reviewer
Code review and quality assurance.

**Best For:**
- Code reviews
- Security audits
- Quality checks

### 🌊 Router
Request routing and classification.

**Best For:**
- Message classification
- Request routing
- Intent detection

### 🌿 Summarizer
Content summarization and condensing.

**Best For:**
- Meeting notes
- Documentation
- Content summary

## Squad Configurations

### Task Distribution Strategies

#### 🎯 Specialized
Agents are selected based on their task specialization and accuracy.

**Best For:**
- Tasks requiring specific expertise
- High-accuracy requirements
- Critical operations

```bash
# Creates a specialized squad
squad quick programmer --name "Expert Coders"
```

#### ⚖️ Balanced
Agents are selected based on overall stats average.

**Best For:**
- General-purpose tasks
- Unknown task complexity
- Flexible workloads

```bash
# In interactive mode, select "Balanced" distribution
squad interactive
```

#### 🔄 Round Robin
Agents are used sequentially in order.

**Best For:**
- Load distribution
- Testing multiple approaches
- Fail-safe execution

```bash
# In interactive mode, select "Round Robin" distribution
squad interactive
```

## Advanced Usage

### Programmatic API

```typescript
import {
  getAgentRegistry,
  getSquadLauncher,
  LLMTask,
} from "@open-composer/agent-registry";

// Get registry instance
const registry = getAgentRegistry();

// Get agents by task
const programmers = registry.getAgentsByTask(LLMTask.PROGRAMMER);

// Create squad launcher
const launcher = getSquadLauncher();

// Create quick squad
const team = launcher.createQuickSquad(LLMTask.PROGRAMMER, "My Squad");

// Launch squad
const results = await launcher.launchSquad(team.id, {
  task: LLMTask.PROGRAMMER,
  priority: 1,
});
```

### Custom Squad Configuration

```typescript
import { getAgentRegistry } from "@open-composer/agent-registry";

const registry = getAgentRegistry();

const squad = registry.createSquad({
  name: "Custom Squad",
  description: "Specialized configuration",
  agentIds: ["agent-1", "agent-2", "agent-3"],
  taskDistribution: "specialized",
  maxConcurrent: 3,
  fallbackEnabled: true,
});
```

## Pokemon-Style Features

### Agent Stats

Each agent has Pokemon-style stats (0-100 scale):

- **Speed**: Response latency and execution speed
- **Accuracy**: Precision and correctness
- **Power**: Capability for complex tasks
- **Efficiency**: Token usage and resource optimization
- **Versatility**: Multi-task adaptability

### Evolution System

Agents can evolve based on model hierarchy:

```
Haiku → Sonnet → Opus (Anthropic)
Nano → Mini → GPT-5 (OpenAI)
Flash → Pro (Google)
```

### Type System

Agents have types based on specializations:

- 🧭 Strategic (Planner)
- ⚡ Electric (Programmer)
- 🔍 Psychic (Reviewer)
- 🌊 Water (Router)
- 🌿 Grass (Summarizer)
- 🌟 Normal (Multi-type)

## Performance Tracking

The system tracks agent performance:

```typescript
// Automatic tracking on squad execution
const results = await launcher.launchSquad(teamId, context);

// View performance stats
const agent = registry.getAgent(agentId);
console.log(agent.performance);
// {
//   totalTokensUsed: 10000,
//   totalRequests: 50,
//   successRate: 95.5,
//   averageLatency: 250
// }
```

## Integration with Open SWE

The squad command integrates with open-swe patterns:

### Model Configuration
```typescript
// Uses TASK_TO_CONFIG_DEFAULTS_MAP
const config = {
  [LLMTask.PROGRAMMER]: {
    modelName: "anthropic:claude-sonnet-4-0",
    temperature: 0,
  },
};
```

### Provider System
```typescript
// Uses PROVIDER_FALLBACK_ORDER
const providers = ["openai", "anthropic", "google-genai"];
```

### Task Assignment
```typescript
// Follows LLMTask enum patterns
enum LLMTask {
  PLANNER = "planner",
  PROGRAMMER = "programmer",
  REVIEWER = "reviewer",
  ROUTER = "router",
  SUMMARIZER = "summarizer",
}
```

## Examples

### Example 1: Quick Development Squad

```bash
# Create and launch a programming squad
squad quick programmer --name "Dev Team" --launch
```

### Example 2: Custom Review Team

```bash
# Start interactive mode
squad interactive

# Then select:
# 1. Build Custom Squad
# 2. Select reviewer agents
# 3. Choose specialized distribution
# 4. Set max concurrent to 2
```

### Example 3: Compare Providers

```bash
# List agents by provider
squad list-agents --provider anthropic
squad list-agents --provider openai

# Compare specific agents
squad compare <anthropic-agent-id> <openai-agent-id>
```

### Example 4: Performance Analysis

```bash
# View stats before
squad stats

# Launch squad
squad launch <squad-id> programmer

# View stats after
squad stats
```

## Troubleshooting

### Common Issues

**Issue**: Agent not found
```bash
# Solution: List all agents to find correct ID
squad list-agents
```

**Issue**: Squad launch fails
```bash
# Solution: Check squad configuration
squad list-squads

# Verify agents can handle the task
squad show <agent-id>
```

**Issue**: No agents for task
```bash
# Solution: Check available agents for task
squad list-agents --task programmer
```

## Tips & Best Practices

1. **Use Interactive Mode** for complex squad configurations
2. **Quick Squads** are great for rapid prototyping
3. **Compare Agents** before creating custom squads
4. **Monitor Performance** using registry stats
5. **Use Specialized Distribution** for critical tasks
6. **Use Balanced Distribution** for unknown workloads
7. **Enable Fallback** for production reliability

## Further Reading

- [README.md](./README.md) - Package overview and API reference
- [Open SWE Documentation](https://github.com/langchain-ai/open-swe)
- [Examples](./examples/usage.ts) - Code examples
