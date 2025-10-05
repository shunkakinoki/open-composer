import { createOpenAI } from "@ai-sdk/openai";
import { generateObject, generateText, type LanguageModelV1 } from "ai";
import { z } from "zod";
import {
  getTaskConfigKey,
  LLMTask,
  TASK_TO_CONFIG_DEFAULTS_MAP,
} from "./llm-task.js";
import { type GraphConfig, GraphConfigSchema } from "./state.js";
import type {
  Agent,
  AgentResult,
  CoordinationPlan,
  ProjectRequirements,
  ResourcePlan,
  SubTask,
  SynthesizedResult,
  Task,
  TaskPlan,
} from "./types.js";

/**
 * Professor Oak Orchestrator - Core coordination engine
 *
 * Provides master orchestration for multi-agent systems using LLM-based
 * task management, planning, coordination, and optimization.
 *
 * Features:
 * - Task-based LLM configuration
 * - OpenRouter API integration
 * - Token tracking and caching
 * - State management with LangGraph patterns
 */
export class ProfessorOakOrchestrator {
  private config: GraphConfig;

  constructor(config?: Partial<GraphConfig>) {
    // Merge with defaults
    this.config = GraphConfigSchema.parse(config || {});
  }

  /**
   * Get the API key for OpenRouter
   * Reads from config or OPENROUTER_API_KEY environment variable
   */
  private getApiKey(): string {
    const apiKey =
      this.config.openRouterApiKey ||
      (typeof process !== "undefined"
        ? process.env?.OPENROUTER_API_KEY
        : undefined);
    if (!apiKey) {
      throw new Error(
        "OpenRouter API key not found. Set OPENROUTER_API_KEY environment variable or pass openRouterApiKey in config.",
      );
    }
    return apiKey;
  }

  /**
   * Get model configuration for a specific task
   */
  private getModelConfigForTask(task: LLMTask): {
    modelName: string;
    temperature: number;
  } {
    const configKey = getTaskConfigKey(task);
    const defaults = TASK_TO_CONFIG_DEFAULTS_MAP[task];

    // Get from config or use defaults
    const modelName =
      this.config[`${configKey}ModelName` as keyof GraphConfig] ||
      defaults.modelName;
    const temperature =
      this.config[`${configKey}Temperature` as keyof GraphConfig] ||
      defaults.temperature;

    return {
      modelName: modelName as string,
      temperature: temperature as number,
    };
  }

  /**
   * Create a chat model instance for a specific LLM task
   * Uses OpenRouter with proper configuration
   */
  private async createLLMForTask(_task: LLMTask): Promise<LanguageModelV1> {
    const { modelName } = this.getModelConfigForTask(_task);
    const apiKey = this.getApiKey();

    // Extract provider and model from modelName (e.g., "anthropic:claude-sonnet-4-0")
    const [_provider, ...modelParts] = modelName.split(":");
    const model = modelParts.join(":");

    // Create OpenAI provider configured for OpenRouter
    const provider = createOpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
    });

    // Return the model instance cast to LanguageModelV1
    return provider(model) as unknown as LanguageModelV1;
  }

  /**
   * Plan a project based on requirements
   *
   * @param requirements - Project requirements and objectives
   * @param config - Optional graph configuration override
   * @returns A structured task plan
   */
  async planProject(
    requirements: ProjectRequirements,
    config?: Partial<GraphConfig>,
  ): Promise<TaskPlan> {
    // Merge config if provided
    if (config) {
      this.config = GraphConfigSchema.parse({ ...this.config, ...config });
    }

    const model = await this.createLLMForTask(LLMTask.PLANNER);

    const prompt = `You are a project planning expert. Create a detailed task plan for the following project:

Objective: ${requirements.objective}

Description: ${requirements.description}

${requirements.constraints ? `Constraints: ${requirements.constraints.join(", ")}` : ""}

${requirements.technicalRequirements ? `Technical Requirements: ${requirements.technicalRequirements.join(", ")}` : ""}

Create a comprehensive task plan that breaks down the project into manageable tasks with priorities, dependencies, and estimated efforts.`;

    const TaskPlanSchema = z.object({
      tasks: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          description: z.string(),
          priority: z.number().min(1).max(5),
          estimatedEffort: z.number().optional(),
          dependencies: z.array(z.string()).optional(),
          completed: z.boolean(),
        }),
      ),
      phases: z
        .array(
          z.object({
            name: z.string(),
            taskIds: z.array(z.string()),
          }),
        )
        .optional(),
      totalEffort: z.number().optional(),
    });

    const result = await generateObject({
      model,
      schema: TaskPlanSchema,
      prompt,
    });

    return result.object;
  }

  /**
   * Decompose a task into subtasks
   *
   * @param task - The task to decompose
   * @param agents - Available agents for assignment
   * @param config - Optional graph configuration override
   * @returns Array of subtasks
   */
  async decomposeTask(
    task: Task,
    agents: Agent[],
    config?: Partial<GraphConfig>,
  ): Promise<SubTask[]> {
    if (config) {
      this.config = GraphConfigSchema.parse({ ...this.config, ...config });
    }

    const model = await this.createLLMForTask(LLMTask.PLANNER);

    const agentCapabilities = agents
      .map((a) => `- ${a.name}: ${a.capabilities.join(", ")}`)
      .join("\n");

    const prompt = `Break down the following task into subtasks that can be assigned to specialized agents:

Task: ${task.title}
Description: ${task.description}
Priority: ${task.priority}

Available Agents:
${agentCapabilities}

Create subtasks that leverage the agents' capabilities effectively.`;

    const SubTasksSchema = z.array(
      z.object({
        id: z.string(),
        parentTaskId: z.string(),
        title: z.string(),
        description: z.string(),
        priority: z.number().min(1).max(5),
        estimatedEffort: z.number().optional(),
        dependencies: z.array(z.string()).optional(),
        assignedAgentId: z.string().optional(),
        completed: z.boolean(),
      }),
    );

    const result = await generateObject({
      model,
      schema: SubTasksSchema,
      prompt,
    });

    return result.object;
  }

  /**
   * Coordinate agents and create task assignments
   *
   * @param tasks - Tasks to assign
   * @param agents - Available agents
   * @param config - Optional graph configuration override
   * @returns Coordination plan with assignments
   */
  async coordinateAgents(
    tasks: SubTask[],
    agents: Agent[],
    config?: Partial<GraphConfig>,
  ): Promise<CoordinationPlan> {
    if (config) {
      this.config = GraphConfigSchema.parse({ ...this.config, ...config });
    }

    const model = await this.createLLMForTask(LLMTask.COORDINATOR);

    const tasksInfo = tasks
      .map(
        (t) =>
          `- ${t.id}: ${t.title} (Priority: ${t.priority}, Dependencies: ${t.dependencies?.join(", ") || "none"})`,
      )
      .join("\n");

    const agentsInfo = agents
      .map(
        (a) =>
          `- ${a.id} (${a.name}): Workload ${a.currentWorkload}/${a.maxCapacity}, Capabilities: ${a.capabilities.join(", ")}`,
      )
      .join("\n");

    const prompt = `Create an optimal coordination plan for assigning tasks to agents:

Tasks:
${tasksInfo}

Agents:
${agentsInfo}

Consider agent workloads, capabilities, task dependencies, and priorities to create an efficient execution plan.`;

    const CoordinationPlanSchema = z.object({
      assignments: z.array(
        z.object({
          taskId: z.string(),
          agentId: z.string(),
          scheduledStart: z.number().optional(),
        }),
      ),
      executionOrder: z.array(z.string()),
      estimatedCompletion: z.number().optional(),
    });

    const result = await generateObject({
      model,
      schema: CoordinationPlanSchema,
      prompt,
    });

    return result.object;
  }

  /**
   * Synthesize results from multiple agents
   *
   * @param results - Agent execution results
   * @param config - Optional graph configuration override
   * @returns Synthesized result with combined output
   */
  async synthesizeResults(
    results: AgentResult[],
    config?: Partial<GraphConfig>,
  ): Promise<SynthesizedResult> {
    if (config) {
      this.config = GraphConfigSchema.parse({ ...this.config, ...config });
    }

    const model = await this.createLLMForTask(LLMTask.SYNTHESIZER);

    const resultsInfo = results
      .map(
        (r) =>
          `Agent ${r.agentId} - Task ${r.taskId}: ${r.success ? "SUCCESS" : "FAILED"}${r.error ? ` (Error: ${r.error})` : ""}`,
      )
      .join("\n");

    const prompt = `Synthesize the following agent results into a coherent summary:

${resultsInfo}

Provide a comprehensive synthesis that combines all successful results and addresses any failures.`;

    const result = await generateText({
      model,
      prompt,
    });

    const successCount = results.filter((r) => r.success).length;
    const totalTokens = results.reduce(
      (sum, r) => sum + (r.metadata?.tokensUsed || 0),
      0,
    );
    const totalTime = results.reduce((max, r) => {
      if (!r.metadata) return max;
      const duration = r.metadata.endTime - r.metadata.startTime;
      return Math.max(max, duration);
    }, 0);

    return {
      success: successCount === results.length,
      output: result.text,
      summary: result.text,
      individualResults: results,
      metadata: {
        totalTokensUsed: totalTokens,
        totalExecutionTime: totalTime,
      },
    };
  }

  /**
   * Optimize resource allocation
   *
   * @param plan - Current task plan
   * @param config - Optional graph configuration override
   * @returns Optimized resource plan
   */
  async optimizeResourceAllocation(
    plan: TaskPlan,
    config?: Partial<GraphConfig>,
  ): Promise<ResourcePlan> {
    if (config) {
      this.config = GraphConfigSchema.parse({ ...this.config, ...config });
    }

    const model = await this.createLLMForTask(LLMTask.OPTIMIZER);

    const tasksInfo = plan.tasks
      .map(
        (t) =>
          `- ${t.id}: ${t.title} (Priority: ${t.priority}, Effort: ${t.estimatedEffort || "unknown"})`,
      )
      .join("\n");

    const prompt = `Analyze the following task plan and provide resource optimization recommendations:

Tasks:
${tasksInfo}

Total Effort: ${plan.totalEffort || "unknown"}

Identify potential bottlenecks, suggest optimal resource allocation strategies, and provide optimization recommendations.`;

    const ResourcePlanSchema = z.object({
      agentAllocations: z.array(
        z.object({
          agentId: z.string(),
          allocatedTasks: z.array(z.string()),
          utilizationPercentage: z.number(),
        }),
      ),
      optimizations: z.array(z.string()).optional(),
      bottlenecks: z.array(z.string()).optional(),
    });

    const result = await generateObject({
      model,
      schema: ResourcePlanSchema,
      prompt,
    });

    return result.object;
  }
}
