import { describe, expect, test } from "bun:test";
import type {
  Agent,
  AgentResult,
  CoordinationPlan,
  ModelTokenData,
  ProjectRequirements,
  ResourcePlan,
  SubTask,
  SynthesizedResult,
  Task,
  TaskPlan,
} from "../src/types.js";

describe.concurrent("Types", () => {
  test.concurrent("ProjectRequirements should have required fields", async () => {
    const requirements: ProjectRequirements = {
      objective: "Build a REST API",
      description: "Create user management API",
      constraints: ["TypeScript", "Tests required"],
      technicalRequirements: ["Express.js", "PostgreSQL"],
    };

    expect(requirements.objective).toBe("Build a REST API");
    expect(requirements.description).toBe("Create user management API");
    expect(requirements.constraints).toHaveLength(2);
    expect(requirements.technicalRequirements).toHaveLength(2);
  });

  test.concurrent("Task should have required fields", async () => {
    const task: Task = {
      id: "task-1",
      title: "Implement authentication",
      description: "Add JWT authentication",
      priority: 1,
      estimatedEffort: 8,
      dependencies: [],
      completed: false,
    };

    expect(task.id).toBe("task-1");
    expect(task.priority).toBe(1);
    expect(task.completed).toBe(false);
  });

  test.concurrent("SubTask should extend Task", async () => {
    const subtask: SubTask = {
      id: "subtask-1",
      parentTaskId: "task-1",
      title: "Create JWT middleware",
      description: "Implement JWT verification middleware",
      priority: 1,
      completed: false,
      assignedAgentId: "agent-1",
    };

    expect(subtask.parentTaskId).toBe("task-1");
    expect(subtask.assignedAgentId).toBe("agent-1");
  });

  test.concurrent("TaskPlan should contain tasks array", async () => {
    const plan: TaskPlan = {
      tasks: [
        {
          id: "task-1",
          title: "Setup",
          description: "Initial setup",
          priority: 1,
          completed: false,
        },
      ],
      phases: [
        {
          name: "Phase 1",
          taskIds: ["task-1"],
        },
      ],
      totalEffort: 40,
    };

    expect(plan.tasks).toHaveLength(1);
    expect(plan.phases).toHaveLength(1);
    expect(plan.totalEffort).toBe(40);
  });

  test.concurrent("Agent should have capabilities array", async () => {
    const agent: Agent = {
      id: "agent-1",
      name: "Backend Developer",
      capabilities: ["TypeScript", "Node.js", "PostgreSQL"],
      currentWorkload: 2,
      maxCapacity: 5,
    };

    expect(agent.capabilities).toHaveLength(3);
    expect(agent.currentWorkload).toBeLessThan(agent.maxCapacity);
  });

  test.concurrent("AgentResult should have metadata", async () => {
    const result: AgentResult = {
      agentId: "agent-1",
      taskId: "task-1",
      success: true,
      output: { data: "result" },
      metadata: {
        startTime: Date.now() - 1000,
        endTime: Date.now(),
        tokensUsed: 500,
      },
    };

    expect(result.success).toBe(true);
    expect(result.metadata?.tokensUsed).toBe(500);
  });

  test.concurrent("CoordinationPlan should have assignments", async () => {
    const plan: CoordinationPlan = {
      assignments: [
        {
          taskId: "task-1",
          agentId: "agent-1",
          scheduledStart: Date.now(),
        },
      ],
      executionOrder: ["task-1", "task-2"],
      estimatedCompletion: Date.now() + 3600000,
    };

    expect(plan.assignments).toHaveLength(1);
    expect(plan.executionOrder).toHaveLength(2);
  });

  test.concurrent("SynthesizedResult should aggregate results", async () => {
    const synthesized: SynthesizedResult = {
      success: true,
      output: "Combined output",
      summary: "All tasks completed successfully",
      individualResults: [],
      metadata: {
        totalTokensUsed: 1500,
        totalExecutionTime: 5000,
      },
    };

    expect(synthesized.success).toBe(true);
    expect(synthesized.metadata?.totalTokensUsed).toBe(1500);
  });

  test.concurrent("ResourcePlan should have agent allocations", async () => {
    const resourcePlan: ResourcePlan = {
      agentAllocations: [
        {
          agentId: "agent-1",
          allocatedTasks: ["task-1", "task-2"],
          utilizationPercentage: 80,
        },
      ],
      optimizations: ["Balance workload across agents"],
      bottlenecks: ["Agent-1 overloaded"],
    };

    expect(resourcePlan.agentAllocations).toHaveLength(1);
    expect(resourcePlan.agentAllocations[0].utilizationPercentage).toBe(80);
  });

  test.concurrent("ModelTokenData should track token usage", async () => {
    const tokenData: ModelTokenData = {
      model: "anthropic:claude-sonnet-4-0",
      cacheCreationInputTokens: 100,
      cacheReadInputTokens: 50,
      inputTokens: 200,
      outputTokens: 150,
    };

    expect(tokenData.model).toBe("anthropic:claude-sonnet-4-0");
    expect(tokenData.cacheCreationInputTokens).toBe(100);
  });
});
