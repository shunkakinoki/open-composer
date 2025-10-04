import { describe, expect, test } from "bun:test";
import {
  makeAPIError,
  makeConfigError,
  makeValidationError,
  type OrchestratorAPIError,
  type OrchestratorConfigError,
  type OrchestratorValidationError,
} from "../src/errors.js";

describe.concurrent("Error Types", () => {
  test.concurrent("makeConfigError should create config error", async () => {
    const error = makeConfigError({
      message: "Missing API key",
      cause: new Error("Environment variable not set"),
    });

    expect(error._tag).toBe("OrchestratorConfigError");
    expect(error.message).toBe("Missing API key");
    expect(error.cause).toBeDefined();
  });

  test.concurrent("makeAPIError should create API error", async () => {
    const error = makeAPIError({
      message: "Failed to call model",
      modelName: "anthropic:claude-sonnet-4-0",
      task: "planner",
      cause: new Error("Network timeout"),
    });

    expect(error._tag).toBe("OrchestratorAPIError");
    expect(error.message).toBe("Failed to call model");
    expect(error.modelName).toBe("anthropic:claude-sonnet-4-0");
    expect(error.task).toBe("planner");
  });

  test.concurrent("makeValidationError should create validation error", async () => {
    const error = makeValidationError({
      message: "Invalid priority value",
      field: "priority",
      cause: new Error("Must be between 1 and 5"),
    });

    expect(error._tag).toBe("OrchestratorValidationError");
    expect(error.message).toBe("Invalid priority value");
    expect(error.field).toBe("priority");
  });

  test.concurrent("ConfigError should work without cause", async () => {
    const error: OrchestratorConfigError = {
      _tag: "OrchestratorConfigError",
      message: "Invalid configuration",
    };

    expect(error._tag).toBe("OrchestratorConfigError");
    expect(error.cause).toBeUndefined();
  });

  test.concurrent("APIError should contain model and task info", async () => {
    const error: OrchestratorAPIError = {
      _tag: "OrchestratorAPIError",
      message: "Rate limit exceeded",
      modelName: "anthropic:claude-opus-4-0",
      task: "coordinator",
    };

    expect(error.modelName).toBe("anthropic:claude-opus-4-0");
    expect(error.task).toBe("coordinator");
  });

  test.concurrent("ValidationError should specify field", async () => {
    const error: OrchestratorValidationError = {
      _tag: "OrchestratorValidationError",
      message: "Field is required",
      field: "objective",
    };

    expect(error.field).toBe("objective");
    expect(error.message).toBe("Field is required");
  });

  test.concurrent("Error factories should preserve all properties", async () => {
    const configError = makeConfigError({
      message: "Test config error",
      cause: { detail: "test" },
    });

    const apiError = makeAPIError({
      message: "Test API error",
      modelName: "test-model",
      task: "test-task",
      cause: { detail: "test" },
    });

    const validationError = makeValidationError({
      message: "Test validation error",
      field: "test-field",
      cause: { detail: "test" },
    });

    expect(configError).toHaveProperty("_tag");
    expect(configError).toHaveProperty("message");
    expect(configError).toHaveProperty("cause");

    expect(apiError).toHaveProperty("_tag");
    expect(apiError).toHaveProperty("modelName");
    expect(apiError).toHaveProperty("task");

    expect(validationError).toHaveProperty("_tag");
    expect(validationError).toHaveProperty("field");
  });
});
