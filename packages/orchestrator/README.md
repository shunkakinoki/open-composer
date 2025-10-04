# @open-composer/orchestrator

Core orchestration package following Open SWE patterns with LLM task management and state handling. Provides master coordination using OpenRouter API with proper token tracking and caching.

**Built with Effect-ts** for functional error handling, type safety, and dependency injection following the monorepo's code practices.

## Features

- **Effect-ts Integration**: Functional error handling with tagged errors and Effect pipelines
- **LLM Task Management**: Uses LLMTask enum and TASK_TO_CONFIG_DEFAULTS_MAP for different orchestration roles
- **State Management**: Follows LangGraph patterns for state reducers and schema validation
- **Token Tracking**: Integrates token tracking and caching for cost optimization
- **OpenRouter Integration**: Uses OpenRouter API with support for multiple model providers
- **Orchestration Roles**: Planner, Coordinator, Synthesizer, and Optimizer tasks
- **Type Safety**: Full TypeScript support with readonly types

## Installation

```bash
bun add @open-composer/orchestrator
```

## Usage

### Effect-based API (Recommended)

The Effect-based API provides functional error handling and composability:

```typescript
import * as Effect from "effect/Effect";
import {
  makeOrchestratorService,
  type ProjectRequirements,
} from "@open-composer/orchestrator";

// Create orchestrator service
const service = makeOrchestratorService({
  openRouterApiKey: process.env.OPENROUTER_API_KEY,
  plannerModelName: "anthropic:claude-sonnet-4-0",
  plannerTemperature: 0,
});

// Create a program
const program = service.planProject({
  objective: "Build a REST API",
  description: "Create a REST API for user management with authentication",
  constraints: ["Must use TypeScript", "Must include tests"],
  technicalRequirements: ["Express.js", "JWT authentication", "PostgreSQL"],
});

// Run the program
const result = await Effect.runPromise(program);

// Handle errors
const resultWithErrorHandling = await Effect.runPromise(
  Effect.gen(function* () {
    const plan = yield* program;
    console.log("Success:", plan);
    return plan;
  }).pipe(
    Effect.catchTag("OrchestratorConfigError", (error) =>
      Effect.succeed({ error: error.message }),
    ),
    Effect.catchTag("OrchestratorAPIError", (error) =>
      Effect.succeed({ error: error.message, model: error.modelName }),
    ),
  ),
);
```

### Using Helper Functions with Dependency Injection

```typescript
import * as Effect from "effect/Effect";
import * as Context from "effect/Context";
import {
  OrchestratorService,
  makeOrchestratorService,
  planProject,
} from "@open-composer/orchestrator";

// Create service instance
const service = makeOrchestratorService({
  openRouterApiKey: process.env.OPENROUTER_API_KEY,
});

// Create program with helper function
const program = planProject({
  objective: "Build a REST API",
  description: "Create a REST API for user management",
});

// Provide the service and run
const result = await Effect.runPromise(
  program.pipe(Effect.provideService(OrchestratorService, service)),
);
```

### Decompose Tasks

```typescript
import * as Effect from "effect/Effect";
import type { Task, Agent } from "@open-composer/orchestrator";

const task: Task = {
  id: "task-1",
  title: "Implement user authentication",
  description: "Add JWT-based authentication to the API",
  priority: 1,
  completed: false,
};

const agents: ReadonlyArray<Agent> = [
  {
    id: "agent-1",
    name: "Backend Developer",
    capabilities: ["TypeScript", "Express.js", "Database"],
    currentWorkload: 2,
    maxCapacity: 5,
  },
  {
    id: "agent-2",
    name: "Security Specialist",
    capabilities: ["Security", "JWT", "Encryption"],
    currentWorkload: 1,
    maxCapacity: 3,
  },
];

const program = service.decomposeTask(task, agents);
const subtasks = await Effect.runPromise(program);
```

### Coordinate Agents

```typescript
const coordinationProgram = service.coordinateAgents(subtasks, agents);
const plan = await Effect.runPromise(coordinationProgram);

console.log("Assignments:", plan.assignments);
console.log("Execution order:", plan.executionOrder);
```

### Synthesize Results

```typescript
import type { AgentResult } from "@open-composer/orchestrator";

const results: ReadonlyArray<AgentResult> = [
  {
    agentId: "agent-1",
    taskId: "task-1-1",
    success: true,
    output: { /* result data */ },
    metadata: {
      startTime: Date.now() - 5000,
      endTime: Date.now(),
      tokensUsed: 1500,
    },
  },
];

const synthesisProgram = service.synthesizeResults(results);
const synthesis = await Effect.runPromise(synthesisProgram);

console.log("Summary:", synthesis.summary);
console.log("Overall success:", synthesis.success);
```

### Error Handling

The Effect-based API uses tagged errors for type-safe error handling:

```typescript
import * as Effect from "effect/Effect";
import {
  type OrchestratorError,
  type OrchestratorConfigError,
  type OrchestratorAPIError,
} from "@open-composer/orchestrator";

const program = service.planProject(requirements).pipe(
  Effect.catchTags({
    OrchestratorConfigError: (error) => {
      console.error("Configuration error:", error.message);
      return Effect.succeed(null);
    },
    OrchestratorAPIError: (error) => {
      console.error(`API error for ${error.modelName}:`, error.message);
      return Effect.succeed(null);
    },
    OrchestratorValidationError: (error) => {
      console.error(`Validation error in ${error.field}:`, error.message);
      return Effect.succeed(null);
    },
  }),
);

const result = await Effect.runPromise(program);
```

### Legacy Class-based API

For backwards compatibility, a class-based API is also available:

```typescript
import { ProfessorOakOrchestrator } from "@open-composer/orchestrator";

const orchestrator = new ProfessorOakOrchestrator({
  openRouterApiKey: process.env.OPENROUTER_API_KEY,
  plannerModelName: "anthropic:claude-sonnet-4-0",
});

// All methods return promises directly
const plan = await orchestrator.planProject({
  objective: "Build a REST API",
  description: "Create a REST API for user management",
});
```

## Configuration

The orchestrator accepts the following configuration options:

```typescript
interface GraphConfig {
  // Planner configuration
  readonly plannerModelName?: string; // Default: "anthropic:claude-sonnet-4-0"
  readonly plannerTemperature?: number; // Default: 0

  // Coordinator configuration
  readonly coordinatorModelName?: string; // Default: "anthropic:claude-sonnet-4-0"
  readonly coordinatorTemperature?: number; // Default: 0

  // Synthesizer configuration
  readonly synthesizerModelName?: string; // Default: "anthropic:claude-sonnet-4-0"
  readonly synthesizerTemperature?: number; // Default: 0

  // Optimizer configuration
  readonly optimizerModelName?: string; // Default: "anthropic:claude-3-5-haiku-latest"
  readonly optimizerTemperature?: number; // Default: 0

  // General settings
  readonly maxTokens?: number; // Default: 10000
  readonly openRouterApiKey?: string; // Falls back to OPENROUTER_API_KEY env var
}
```

## State Management

The package follows LangGraph patterns for state management:

```typescript
import {
  OrchestratorStateAnnotation,
  type OrchestratorState,
} from "@open-composer/orchestrator";

// Use with LangGraph
const state: OrchestratorState = {
  messages: [],
  taskPlan: null,
  orchestrationNotes: "",
  tokenData: [],
  activeTaskId: null,
  agentWorkloads: {},
  executionMetadata: {},
};
```

## LLM Tasks

The package defines four core LLM task types:

- **PLANNER**: Project planning, requirement analysis, task breakdown
- **COORDINATOR**: Task assignment, dependency management, scheduling
- **SYNTHESIZER**: Result aggregation, summary generation
- **OPTIMIZER**: Resource optimization, bottleneck identification

Each task type has default model configurations that can be overridden.

## Token Tracking

Token usage is automatically tracked using the `tokenDataReducer`:

```typescript
import { tokenDataReducer } from "@open-composer/orchestrator";

// Reducer handles merging token data across multiple LLM calls
const mergedTokens = tokenDataReducer(existingTokenData, newTokenData);
```

## API Reference

### OrchestratorService (Effect-based)

Main orchestrator service with the following methods (all return `Effect.Effect<T, OrchestratorError>`):

- `planProject(requirements, config?)`: Create a project plan
- `decomposeTask(task, agents, config?)`: Break down a task into subtasks
- `coordinateAgents(tasks, agents, config?)`: Create task assignments
- `synthesizeResults(results, config?)`: Combine agent results
- `optimizeResourceAllocation(plan, config?)`: Optimize resource usage

### ProfessorOakOrchestrator (Legacy)

Legacy class-based API with the same methods returning `Promise<T>`.

## Error Types

- `OrchestratorConfigError`: Configuration errors (missing API keys, invalid settings)
- `OrchestratorAPIError`: API call failures (model errors, network issues)
- `OrchestratorValidationError`: Input validation errors

## License

MIT
