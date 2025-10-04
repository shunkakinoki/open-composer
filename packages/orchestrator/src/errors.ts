/**
 * Error types for orchestrator operations
 * Following Effect-ts patterns with tagged errors
 */

export interface OrchestratorConfigError {
  readonly _tag: "OrchestratorConfigError";
  readonly message: string;
  readonly cause?: unknown;
}

export interface OrchestratorAPIError {
  readonly _tag: "OrchestratorAPIError";
  readonly message: string;
  readonly modelName: string;
  readonly task: string;
  readonly cause?: unknown;
}

export interface OrchestratorValidationError {
  readonly _tag: "OrchestratorValidationError";
  readonly message: string;
  readonly field: string;
  readonly cause?: unknown;
}

export type OrchestratorError =
  | OrchestratorConfigError
  | OrchestratorAPIError
  | OrchestratorValidationError;

export const makeConfigError = (params: {
  readonly message: string;
  readonly cause?: unknown;
}): OrchestratorConfigError => ({
  _tag: "OrchestratorConfigError",
  ...params,
});

export const makeAPIError = (params: {
  readonly message: string;
  readonly modelName: string;
  readonly task: string;
  readonly cause?: unknown;
}): OrchestratorAPIError => ({
  _tag: "OrchestratorAPIError",
  ...params,
});

export const makeValidationError = (params: {
  readonly message: string;
  readonly field: string;
  readonly cause?: unknown;
}): OrchestratorValidationError => ({
  _tag: "OrchestratorValidationError",
  ...params,
});
