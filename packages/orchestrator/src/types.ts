/**
 * Project requirements for orchestration planning
 */
export interface ProjectRequirements {
  /**
   * The main objective or goal of the project
   */
  readonly objective: string;

  /**
   * Detailed description of requirements
   */
  readonly description: string;

  /**
   * Optional constraints or limitations
   */
  readonly constraints?: ReadonlyArray<string>;

  /**
   * Optional technical requirements
   */
  readonly technicalRequirements?: ReadonlyArray<string>;
}

/**
 * A single task in the task plan
 */
export interface Task {
  /**
   * Unique identifier for the task
   */
  readonly id: string;

  /**
   * Task title
   */
  readonly title: string;

  /**
   * Detailed description of the task
   */
  readonly description: string;

  /**
   * Priority level (1-5, where 1 is highest)
   */
  readonly priority: number;

  /**
   * Estimated effort (in hours or story points)
   */
  readonly estimatedEffort?: number;

  /**
   * Dependencies on other tasks (task IDs)
   */
  readonly dependencies?: ReadonlyArray<string>;

  /**
   * Whether the task is completed
   */
  readonly completed: boolean;
}

/**
 * A subtask decomposed from a parent task
 */
export interface SubTask extends Task {
  /**
   * Parent task ID
   */
  readonly parentTaskId: string;

  /**
   * Assigned agent ID (if any)
   */
  readonly assignedAgentId?: string;
}

/**
 * Overall task plan for a project
 */
export interface TaskPlan {
  /**
   * All tasks in the plan
   */
  readonly tasks: ReadonlyArray<Task>;

  /**
   * Project timeline in phases
   */
  readonly phases?: ReadonlyArray<{
    readonly name: string;
    readonly taskIds: ReadonlyArray<string>;
  }>;

  /**
   * Estimated total effort
   */
  readonly totalEffort?: number;
}

/**
 * Agent information for task assignment
 */
export interface Agent {
  /**
   * Unique agent identifier
   */
  readonly id: string;

  /**
   * Agent name
   */
  readonly name: string;

  /**
   * Agent capabilities/skills
   */
  readonly capabilities: ReadonlyArray<string>;

  /**
   * Current workload (number of assigned tasks)
   */
  readonly currentWorkload: number;

  /**
   * Maximum capacity
   */
  readonly maxCapacity: number;
}

/**
 * Result from an agent's task execution
 */
export interface AgentResult {
  /**
   * Agent ID
   */
  readonly agentId: string;

  /**
   * Task ID
   */
  readonly taskId: string;

  /**
   * Success status
   */
  readonly success: boolean;

  /**
   * Output or result data
   */
  readonly output?: unknown;

  /**
   * Error message if failed
   */
  readonly error?: string;

  /**
   * Execution metadata
   */
  readonly metadata?: {
    readonly startTime: number;
    readonly endTime: number;
    readonly tokensUsed?: number;
  };
}

/**
 * Coordination plan for agent task assignment
 */
export interface CoordinationPlan {
  /**
   * Task assignments
   */
  readonly assignments: ReadonlyArray<{
    readonly taskId: string;
    readonly agentId: string;
    readonly scheduledStart?: number;
  }>;

  /**
   * Execution order
   */
  readonly executionOrder: ReadonlyArray<string>;

  /**
   * Estimated completion time
   */
  readonly estimatedCompletion?: number;
}

/**
 * Synthesized result from multiple agent outputs
 */
export interface SynthesizedResult {
  /**
   * Overall success status
   */
  readonly success: boolean;

  /**
   * Combined output
   */
  readonly output: unknown;

  /**
   * Summary of all agent results
   */
  readonly summary: string;

  /**
   * Individual results
   */
  readonly individualResults: ReadonlyArray<AgentResult>;

  /**
   * Metadata
   */
  readonly metadata?: {
    readonly totalTokensUsed?: number;
    readonly totalExecutionTime?: number;
  };
}

/**
 * Resource allocation plan
 */
export interface ResourcePlan {
  /**
   * Agent allocations
   */
  readonly agentAllocations: ReadonlyArray<{
    readonly agentId: string;
    readonly allocatedTasks: ReadonlyArray<string>;
    readonly utilizationPercentage: number;
  }>;

  /**
   * Recommended optimizations
   */
  readonly optimizations?: ReadonlyArray<string>;

  /**
   * Resource bottlenecks identified
   */
  readonly bottlenecks?: ReadonlyArray<string>;
}

/**
 * Token usage data for caching and cost tracking
 */
export interface ModelTokenData {
  /**
   * Model identifier
   */
  readonly model: string;

  /**
   * Cache creation input tokens
   */
  readonly cacheCreationInputTokens: number;

  /**
   * Cache read input tokens
   */
  readonly cacheReadInputTokens: number;

  /**
   * Regular input tokens
   */
  readonly inputTokens: number;

  /**
   * Output tokens
   */
  readonly outputTokens: number;
}
