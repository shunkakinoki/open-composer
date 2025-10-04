import { describe, expect, test } from "bun:test";
import {
  makeOrchestratorService,
  OrchestratorService,
} from "../src/service.js";

describe.concurrent("Orchestrator Service", () => {
  test.concurrent("OrchestratorService should be defined", async () => {
    expect(OrchestratorService).toBeDefined();
    expect(typeof OrchestratorService).toBe("object");
  });

  test.concurrent(
    "makeOrchestratorService should create service instance",
    async () => {
      const service = makeOrchestratorService({
        openRouterApiKey: "test-key",
      });

      expect(service).toBeDefined();
      expect(typeof service.planProject).toBe("function");
      expect(typeof service.decomposeTask).toBe("function");
      expect(typeof service.coordinateAgents).toBe("function");
      expect(typeof service.synthesizeResults).toBe("function");
      expect(typeof service.optimizeResourceAllocation).toBe("function");
    },
  );

  test.concurrent("service should have all required methods", async () => {
    const service = makeOrchestratorService();

    expect(service).toHaveProperty("planProject");
    expect(service).toHaveProperty("decomposeTask");
    expect(service).toHaveProperty("coordinateAgents");
    expect(service).toHaveProperty("synthesizeResults");
    expect(service).toHaveProperty("optimizeResourceAllocation");
  });

  test.concurrent("service methods should return Effects", async () => {
    const service = makeOrchestratorService({
      openRouterApiKey: "test-key",
    });

    const projectRequirements = {
      objective: "Test objective",
      description: "Test description",
    };

    const effect = service.planProject(projectRequirements);

    // Effect should have pipe method
    expect(effect).toBeDefined();
    expect(typeof effect.pipe).toBe("function");
  });

  test.concurrent("service should accept config overrides", async () => {
    const service = makeOrchestratorService({
      plannerModelName: "anthropic:claude-opus-4-0",
      plannerTemperature: 0.5,
    });

    expect(service).toBeDefined();
  });

  test.concurrent("service should work without initial config", async () => {
    const service = makeOrchestratorService();

    expect(service).toBeDefined();
    expect(typeof service.planProject).toBe("function");
  });

  test.concurrent(
    "all service methods should accept optional config",
    async () => {
      const service = makeOrchestratorService({
        openRouterApiKey: "test-key",
      });

      const projectRequirements = {
        objective: "Test",
        description: "Test",
      };

      const task = {
        id: "1",
        title: "Test",
        description: "Test",
        priority: 1,
        completed: false,
      };

      const agents: ReadonlyArray<{
        readonly id: string;
        readonly name: string;
        readonly capabilities: ReadonlyArray<string>;
        readonly currentWorkload: number;
        readonly maxCapacity: number;
      }> = [];

      const subtasks: ReadonlyArray<{
        readonly id: string;
        readonly parentTaskId: string;
        readonly title: string;
        readonly description: string;
        readonly priority: number;
        readonly completed: boolean;
      }> = [];

      const results: ReadonlyArray<{
        readonly agentId: string;
        readonly taskId: string;
        readonly success: boolean;
      }> = [];

      const taskPlan = {
        tasks: [],
      };

      // All these should accept config as second parameter
      expect(() => service.planProject(projectRequirements, {})).not.toThrow();
      expect(() => service.decomposeTask(task, agents, {})).not.toThrow();
      expect(() =>
        service.coordinateAgents(subtasks, agents, {}),
      ).not.toThrow();
      expect(() => service.synthesizeResults(results, {})).not.toThrow();
      expect(() =>
        service.optimizeResourceAllocation(taskPlan, {}),
      ).not.toThrow();
    },
  );
});
