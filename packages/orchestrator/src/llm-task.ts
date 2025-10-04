/**
 * LLM Task enumeration following Open SWE patterns
 * Defines different orchestration roles and their purposes
 */
export enum LLMTask {
  /**
   * Used for planning tasks. This includes: project planning,
   * breaking down requirements, creating task hierarchies, etc.
   */
  PLANNER = "planner",

  /**
   * Used for routing and coordination. This includes: assigning tasks
   * to agents, managing dependencies, scheduling execution, etc.
   */
  COORDINATOR = "coordinator",

  /**
   * Used for synthesizing results. This includes: combining agent outputs,
   * generating summaries, aggregating results, etc.
   */
  SYNTHESIZER = "synthesizer",

  /**
   * Used for resource optimization. This includes: balancing workloads,
   * identifying bottlenecks, optimizing resource allocation, etc.
   */
  OPTIMIZER = "optimizer",
}

/**
 * Default configuration map for each LLM task type
 * Following Open SWE's TASK_TO_CONFIG_DEFAULTS_MAP pattern
 */
export const TASK_TO_CONFIG_DEFAULTS_MAP: Record<
  LLMTask,
  {
    modelName: string;
    temperature: number;
  }
> = {
  [LLMTask.PLANNER]: {
    modelName: "anthropic:claude-sonnet-4-0",
    temperature: 0,
  },
  [LLMTask.COORDINATOR]: {
    modelName: "anthropic:claude-sonnet-4-0",
    temperature: 0,
  },
  [LLMTask.SYNTHESIZER]: {
    modelName: "anthropic:claude-sonnet-4-0",
    temperature: 0,
  },
  [LLMTask.OPTIMIZER]: {
    modelName: "anthropic:claude-3-5-haiku-latest",
    temperature: 0,
  },
};

/**
 * Get the configuration key prefix for a given task
 * Used to look up task-specific config from GraphConfig
 */
export function getTaskConfigKey(task: LLMTask): string {
  switch (task) {
    case LLMTask.PLANNER:
      return "planner";
    case LLMTask.COORDINATOR:
      return "coordinator";
    case LLMTask.SYNTHESIZER:
      return "synthesizer";
    case LLMTask.OPTIMIZER:
      return "optimizer";
    default:
      return "planner";
  }
}
