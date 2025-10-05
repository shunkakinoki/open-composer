# Squad Command Documentation

## Overview

The `squad` command is a CLI tool for managing custom agent squads with Pokemon-style configuration. It provides both interactive and command-line interfaces for creating, managing, and launching agent teams based on open-swe patterns.

## Installation

```bash
#  The squad command is part of the open-composer CLI
bun add @open-composer/agent-registry

# Or install globally
bun install -g @open-composer/agent-registry
```

## Quick Start

```bash
# Start interactive mode (recommended for beginners)
open-composer squad interactive

# Create a quick open-composer squad for a specific task
open-composer squad quick programmer --name "Code Squad" --launch

# List all available agents
open-composer squad list-agents

# View registry statistics
open-composer squad stats
```

## Commands

### Interactive Mode

Launch the Pokemon-style interactive UI for open-composer squad management:

```bash
open-composer squad interactive
# or
open-composer squad i
```

Features:
- 🎯 Create Quick Squad
- 🏗️ Build Custom Squad
- 👥 View All Agents
- 🎖️ View All Squads
- 📊 View Registry Stats
- 🆚 Compare Agents

### Quick Squad

Create a open-composer squad optimized for a specific task:

```bash
open-composer squad quick <task> [options]

# Examples:
open-composer squad quick programmer
open-composer squad quick planner --name "Planning Team"
open-composer squad quick reviewer --launch
```

**Arguments:**
- `<task>` - Task type: `planner`, `programmer`, `reviewer`, `router`, or `summarizer`

**Options:**
- `-n, --name <name>` - Custom open-composer squad name
- `-l, --launch` - Launch open-composer squad immediately after creation

### List Agents

Display all available agents with optional filtering:

```bash
open-composer squad list-agents [options]

# Examples:
open-composer squad list-agents
open-composer squad list-agents --tier legendary
open-composer squad list-agents --provider anthropic
open-composer squad list-agents --task programmer
```

**Options:**
- `-t, --tier <tier>` - Filter by tier: `starter`, `evolved`, or `legendary`
- `-p, --provider <provider>` - Filter by provider: `anthropic`, `openai`, or `google-genai`
- `-k, --task <task>` - Filter by task specialization

### List Squads

Display all created squads:

```bash
open-composer squad list-squads
# or
open-composer squad ls
```

### Show Agent Details

Display detailed information about a specific agent:

```bash
open-composer squad show <agentId>

# Example:
open-composer squad show 550e8400-e29b-41d4-a716-446655440000
```

Shows:
- Agent card with stats
- Task specializations
- Evolution tree
- Performance metrics

### Compare Agents

Compare two agents side-by-side:

```bash
open-composer squad compare <agent1Id> <agent2Id>

# Example:
open-composer squad compare 550e8400-e29b-41d4-a716-446655440000 660f9500-f30c-52e5-b827-557766551111
```

### Registry Statistics

View overall registry statistics:

```bash
open-composer squad stats
```

Displays:
- Total agents and squads
- Tier distribution
- Provider distribution
- Performance metrics

### Launch Squad

Execute an existing open-composer squad for a task:

```bash
open-composer squad launch <squadId> <task>

# Example:
open-composer squad launch 770g0600-g40d-63f6-c938-668877662222 programmer
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
open-composer squad quick programmer --name "Expert Coders"
```

#### ⚖️ Balanced
Agents are selected based on overall stats average.

**Best For:**
- General-purpose tasks
- Unknown task complexity
- Flexible workloads

```bash
# In interactive mode, select "Balanced" distribution
open-composer squad interactive
```

#### 🔄 Round Robin
Agents are used sequentially in order.

**Best For:**
- Load distribution
- Testing multiple approaches
- Fail-safe execution

```bash
# In interactive mode, select "Round Robin" distribution
open-composer squad interactive
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

// Create open-composer squad launcher
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

const open-composer squad = registry.createSquad({
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
// Automatic tracking on open-composer squad execution
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

The open-composer squad command integrates with open-swe patterns:

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
open-composer squad quick programmer --name "Dev Team" --launch
```

### Example 2: Custom Review Team

```bash
# Start interactive mode
open-composer squad interactive

# Then select:
# 1. Build Custom Squad
# 2. Select reviewer agents
# 3. Choose specialized distribution
# 4. Set max concurrent to 2
```

### Example 3: Compare Providers

```bash
# List agents by provider
open-composer squad list-agents --provider anthropic
open-composer squad list-agents --provider openai

# Compare specific agents
open-composer squad compare <anthropic-agent-id> <openai-agent-id>
```

### Example 4: Performance Analysis

```bash
# View stats before
open-composer squad stats

# Launch squad
open-composer squad launch <squad-id> programmer

# View stats after
open-composer squad stats
```

## Troubleshooting

### Common Issues

**Issue**: Agent not found
```bash
# Solution: List all agents to find correct ID
open-composer squad list-agents
```

**Issue**: Squad launch fails
```bash
# Solution: Check open-composer squad configuration
open-composer squad list-squads

# Verify agents can handle the task
open-composer squad show <agent-id>
```

**Issue**: No agents for task
```bash
# Solution: Check available agents for task
open-composer squad list-agents --task programmer
```

## Tips & Best Practices

1. **Use Interactive Mode** for complex open-composer squad configurations
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
