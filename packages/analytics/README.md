# @open-composer/analytics

Analytics and performance tracking for OpenComposer agents.

## Features

- **Performance Tracking**: Track agent performance metrics (tokens, latency, success rate)
- **Statistics Calculation**: Calculate registry-wide statistics
- **Performance Comparison**: Compare performance between agents
- **Analytics Summaries**: Get comprehensive performance summaries

## Usage

```typescript
import { AgentAnalytics } from "@open-composer/analytics";
import type { OpenComposerAgent } from "@open-composer/agent-registry";

// Update agent performance
AgentAnalytics.updateAgentPerformance(agent, {
  tokensUsed: 1000,
  success: true,
  latency: 500,
});

// Get registry statistics
const stats = AgentAnalytics.calculateStats(agents, teamCount);
console.log(stats);

// Get agent performance summary
const summary = AgentAnalytics.getAgentPerformanceSummary(agent);

// Compare two agents
const comparison = AgentAnalytics.compareAgentPerformance(agent1, agent2);
```

## API

### `AgentAnalytics.updateAgentPerformance(agent, metrics)`

Updates an agent's performance metrics.

**Parameters:**
- `agent: OpenComposerAgent` - The agent to update
- `metrics: PerformanceMetrics` - Performance metrics
  - `tokensUsed: number` - Tokens used in the request
  - `success: boolean` - Whether the request was successful
  - `latency: number` - Request latency in milliseconds

### `AgentAnalytics.calculateStats(agents, teamCount)`

Calculates registry-wide statistics.

**Parameters:**
- `agents: OpenComposerAgent[]` - Array of all agents
- `teamCount: number` - Total number of teams

**Returns:** `RegistryStats` with:
- `totalAgents` - Total number of agents
- `totalTeams` - Total number of teams
- `tierCounts` - Count by tier (starter, evolved, legendary)
- `providerCounts` - Count by provider
- `totalTokensUsed` - Total tokens used across all agents
- `totalRequests` - Total requests across all agents
- `averageSuccessRate` - Average success rate

### `AgentAnalytics.getAgentPerformanceSummary(agent)`

Gets a performance summary for a single agent.

### `AgentAnalytics.compareAgentPerformance(agent1, agent2)`

Compares performance between two agents.

## Integration

This package is used by:
- `@open-composer/agent-registry` - For performance tracking
- `apps/cli` - For displaying analytics in the UI
