import { createOpenAI } from "@ai-sdk/openai";
import { generateObject, generateText, type LanguageModelV1 } from "ai";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import { z } from "zod";
import {
  makeAPIError,
  makeConfigError,
  type OrchestratorError,
} from "./errors.js";
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
 * Orchestrator service interface using Effect-ts patterns
 */
export interface OrchestratorService {
  /**
   * Plan a project based on requirements
   */
  readonly planProject: (
    requirements: ProjectRequirements,
    config?: Partial<GraphConfig>,
  ) => Effect.Effect<TaskPlan, OrchestratorError>;

  /**
   * Decompose a task into subtasks
   */
  readonly decomposeTask: (
    task: Task,
    agents: ReadonlyArray<Agent>,
    config?: Partial<GraphConfig>,
  ) => Effect.Effect<ReadonlyArray<SubTask>, OrchestratorError>;

  /**
   * Coordinate agents and create task assignments
   */
  readonly coordinateAgents: (
    tasks: ReadonlyArray<SubTask>,
    agents: ReadonlyArray<Agent>,
    config?: Partial<GraphConfig>,
  ) => Effect.Effect<CoordinationPlan, OrchestratorError>;

  /**
   * Synthesize results from multiple agents
   */
  readonly synthesizeResults: (
    results: ReadonlyArray<AgentResult>,
    config?: Partial<GraphConfig>,
  ) => Effect.Effect<SynthesizedResult, OrchestratorError>;

  /**
   * Optimize resource allocation
   */
  readonly optimizeResourceAllocation: (
    plan: TaskPlan,
    config?: Partial<GraphConfig>,
  ) => Effect.Effect<ResourcePlan, OrchestratorError>;
}

/**
 * Orchestrator service tag for dependency injection
 */
export const OrchestratorService = Context.GenericTag<OrchestratorService>(
  "@open-composer/orchestrator/OrchestratorService",
);

/**
 * Create the orchestrator service implementation
 */
export const makeOrchestratorService = (
  initialConfig?: Partial<GraphConfig>,
): OrchestratorService => {
  let config = GraphConfigSchema.parse(initialConfig || {});

  const getApiKey = (): Effect.Effect<string, OrchestratorError> =>
    Effect.try({
      try: () => {
        const apiKey =
          config.openRouterApiKey ||
          (typeof process !== "undefined"
            ? process.env?.OPENROUTER_API_KEY
            : undefined);
        if (!apiKey) {
          throw new Error(
            "OpenRouter API key not found. Set OPENROUTER_API_KEY environment variable or pass openRouterApiKey in config.",
          );
        }
        return apiKey;
      },
      catch: (cause) =>
        makeConfigError({
          message: "Failed to get API key",
          cause,
        }),
    });

  const getModelConfigForTask = (
    task: LLMTask,
  ): { readonly modelName: string; readonly temperature: number } => {
    const configKey = getTaskConfigKey(task);
    const defaults = TASK_TO_CONFIG_DEFAULTS_MAP[task];

    const modelName =
      config[`${configKey}ModelName` as keyof GraphConfig] ||
      defaults.modelName;
    const temperature =
      config[`${configKey}Temperature` as keyof GraphConfig] ||
      defaults.temperature;

    return {
      modelName: modelName as string,
      temperature: temperature as number,
    };
  };

  const createLLMForTask = (
    task: LLMTask,
  ): Effect.Effect<LanguageModelV1, OrchestratorError> =>
    Effect.gen(function* () {
      const { modelName } = getModelConfigForTask(task);
      const apiKey = yield* getApiKey();

      const [_provider, ...modelParts] = modelName.split(":");
      const model = modelParts.join(":");

      try {
        const provider = createOpenAI({
          apiKey,
          baseURL: "https://openrouter.ai/api/v1",
        });

        return provider(model) as unknown as LanguageModelV1;
      } catch (cause) {
        return yield* Effect.fail(
          makeAPIError({
            message: "Failed to create LLM instance",
            modelName,
            task,
            cause,
          }),
        );
      }
    });

  const planProject: OrchestratorService["planProject"] = (
    requirements,
    configOverride?,
  ) =>
    Effect.gen(function* () {
      if (configOverride) {
        config = GraphConfigSchema.parse({ ...config, ...configOverride });
      }

      const model = yield* createLLMForTask(LLMTask.PLANNER);

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

      return yield* Effect.tryPromise({
        try: async () => {
          const result = await generateObject({
            model,
            schema: TaskPlanSchema,
            prompt,
          });
          return result.object as TaskPlan;
        },
        catch: (cause) =>
          makeAPIError({
            message: "Failed to generate task plan",
            modelName: getModelConfigForTask(LLMTask.PLANNER).modelName,
            task: LLMTask.PLANNER,
            cause,
          }),
      });
    });

  const decomposeTask: OrchestratorService["decomposeTask"] = (
    task,
    agents,
    configOverride?,
  ) =>
    Effect.gen(function* () {
      if (configOverride) {
        config = GraphConfigSchema.parse({ ...config, ...configOverride });
      }

      const model = yield* createLLMForTask(LLMTask.PLANNER);

      const agentCapabilities = Array.from(agents)
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

      return yield* Effect.tryPromise({
        try: async () => {
          const result = await generateObject({
            model,
            schema: SubTasksSchema,
            prompt,
          });
          return result.object as ReadonlyArray<SubTask>;
        },
        catch: (cause) =>
          makeAPIError({
            message: "Failed to decompose task",
            modelName: getModelConfigForTask(LLMTask.PLANNER).modelName,
            task: LLMTask.PLANNER,
            cause,
          }),
      });
    });

  const coordinateAgents: OrchestratorService["coordinateAgents"] = (
    tasks,
    agents,
    configOverride?,
  ) =>
    Effect.gen(function* () {
      if (configOverride) {
        config = GraphConfigSchema.parse({ ...config, ...configOverride });
      }

      const model = yield* createLLMForTask(LLMTask.COORDINATOR);

      const tasksInfo = Array.from(tasks)
        .map(
          (t) =>
            `- ${t.id}: ${t.title} (Priority: ${t.priority}, Dependencies: ${t.dependencies?.join(", ") || "none"})`,
        )
        .join("\n");

      const agentsInfo = Array.from(agents)
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

      return yield* Effect.tryPromise({
        try: async () => {
          const result = await generateObject({
            model,
            schema: CoordinationPlanSchema,
            prompt,
          });
          return result.object as CoordinationPlan;
        },
        catch: (cause) =>
          makeAPIError({
            message: "Failed to coordinate agents",
            modelName: getModelConfigForTask(LLMTask.COORDINATOR).modelName,
            task: LLMTask.COORDINATOR,
            cause,
          }),
      });
    });

  const synthesizeResults: OrchestratorService["synthesizeResults"] = (
    results,
    configOverride?,
  ) =>
    Effect.gen(function* () {
      if (configOverride) {
        config = GraphConfigSchema.parse({ ...config, ...configOverride });
      }

      const model = yield* createLLMForTask(LLMTask.SYNTHESIZER);

      const resultsInfo = Array.from(results)
        .map(
          (r) =>
            `Agent ${r.agentId} - Task ${r.taskId}: ${r.success ? "SUCCESS" : "FAILED"}${r.error ? ` (Error: ${r.error})` : ""}`,
        )
        .join("\n");

      const prompt = `Synthesize the following agent results into a coherent summary:

${resultsInfo}

Provide a comprehensive synthesis that combines all successful results and addresses any failures.`;

      const summary = yield* Effect.tryPromise({
        try: async () => {
          const result = await generateText({
            model,
            prompt,
          });
          return result.text;
        },
        catch: (cause) =>
          makeAPIError({
            message: "Failed to synthesize results",
            modelName: getModelConfigForTask(LLMTask.SYNTHESIZER).modelName,
            task: LLMTask.SYNTHESIZER,
            cause,
          }),
      });

      const successCount = Array.from(results).filter((r) => r.success).length;
      const totalTokens = Array.from(results).reduce(
        (sum, r) => sum + (r.metadata?.tokensUsed || 0),
        0,
      );
      const totalTime = Array.from(results).reduce((max, r) => {
        if (!r.metadata) return max;
        const duration = r.metadata.endTime - r.metadata.startTime;
        return Math.max(max, duration);
      }, 0);

      return {
        success: successCount === results.length,
        output: summary,
        summary,
        individualResults: results,
        metadata: {
          totalTokensUsed: totalTokens,
          totalExecutionTime: totalTime,
        },
      };
    });

  const optimizeResourceAllocation: OrchestratorService["optimizeResourceAllocation"] =
    (plan, configOverride?) =>
      Effect.gen(function* () {
        if (configOverride) {
          config = GraphConfigSchema.parse({ ...config, ...configOverride });
        }

        const model = yield* createLLMForTask(LLMTask.OPTIMIZER);

        const tasksInfo = Array.from(plan.tasks)
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

        return yield* Effect.tryPromise({
          try: async () => {
            const result = await generateObject({
              model,
              schema: ResourcePlanSchema,
              prompt,
            });
            return result.object as ResourcePlan;
          },
          catch: (cause) =>
            makeAPIError({
              message: "Failed to optimize resource allocation",
              modelName: getModelConfigForTask(LLMTask.OPTIMIZER).modelName,
              task: LLMTask.OPTIMIZER,
              cause,
            }),
        });
      });

  return {
    planProject,
    decomposeTask,
    coordinateAgents,
    synthesizeResults,
    optimizeResourceAllocation,
  };
};

/**
 * Helper functions for common operations
 */
export const planProject = (
  requirements: ProjectRequirements,
  config?: Partial<GraphConfig>,
) =>
  OrchestratorService.pipe(
    Effect.flatMap((svc) => svc.planProject(requirements, config)),
  );

export const decomposeTask = (
  task: Task,
  agents: ReadonlyArray<Agent>,
  config?: Partial<GraphConfig>,
) =>
  OrchestratorService.pipe(
    Effect.flatMap((svc) => svc.decomposeTask(task, agents, config)),
  );

export const coordinateAgents = (
  tasks: ReadonlyArray<SubTask>,
  agents: ReadonlyArray<Agent>,
  config?: Partial<GraphConfig>,
) =>
  OrchestratorService.pipe(
    Effect.flatMap((svc) => svc.coordinateAgents(tasks, agents, config)),
  );

export const synthesizeResults = (
  results: ReadonlyArray<AgentResult>,
  config?: Partial<GraphConfig>,
) =>
  OrchestratorService.pipe(
    Effect.flatMap((svc) => svc.synthesizeResults(results, config)),
  );

export const optimizeResourceAllocation = (
  plan: TaskPlan,
  config?: Partial<GraphConfig>,
) =>
  OrchestratorService.pipe(
    Effect.flatMap((svc) => svc.optimizeResourceAllocation(plan, config)),
  );
