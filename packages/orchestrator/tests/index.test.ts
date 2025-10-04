import { describe, expect, test } from "bun:test";
import * as OrchestratorPackage from "../src/index.js";

describe.concurrent("Package Exports", () => {
  test.concurrent("should export Effect-based service", async () => {
    expect(OrchestratorPackage.OrchestratorService).toBeDefined();
    expect(OrchestratorPackage.makeOrchestratorService).toBeDefined();
    expect(typeof OrchestratorPackage.makeOrchestratorService).toBe("function");
  });

  test.concurrent("should export helper functions", async () => {
    expect(typeof OrchestratorPackage.planProject).toBe("function");
    expect(typeof OrchestratorPackage.decomposeTask).toBe("function");
    expect(typeof OrchestratorPackage.coordinateAgents).toBe("function");
    expect(typeof OrchestratorPackage.synthesizeResults).toBe("function");
    expect(typeof OrchestratorPackage.optimizeResourceAllocation).toBe(
      "function",
    );
  });

  test.concurrent("should export error types", async () => {
    expect(typeof OrchestratorPackage.makeConfigError).toBe("function");
    expect(typeof OrchestratorPackage.makeAPIError).toBe("function");
    expect(typeof OrchestratorPackage.makeValidationError).toBe("function");
  });

  test.concurrent("should export legacy orchestrator class", async () => {
    expect(OrchestratorPackage.ProfessorOakOrchestrator).toBeDefined();
    expect(typeof OrchestratorPackage.ProfessorOakOrchestrator).toBe(
      "function",
    );
  });

  test.concurrent("should export state management", async () => {
    expect(OrchestratorPackage.OrchestratorStateAnnotation).toBeDefined();
    expect(OrchestratorPackage.GraphConfigSchema).toBeDefined();
    expect(typeof OrchestratorPackage.tokenDataReducer).toBe("function");
  });

  test.concurrent("should export LLM task types", async () => {
    expect(OrchestratorPackage.LLMTask).toBeDefined();
    expect(OrchestratorPackage.TASK_TO_CONFIG_DEFAULTS_MAP).toBeDefined();
    expect(typeof OrchestratorPackage.getTaskConfigKey).toBe("function");
  });

  test.concurrent("should have all LLM task enum values", async () => {
    expect(OrchestratorPackage.LLMTask.PLANNER).toBe("planner");
    expect(OrchestratorPackage.LLMTask.COORDINATOR).toBe("coordinator");
    expect(OrchestratorPackage.LLMTask.SYNTHESIZER).toBe("synthesizer");
    expect(OrchestratorPackage.LLMTask.OPTIMIZER).toBe("optimizer");
  });

  test.concurrent("should export all necessary types", async () => {
    // This test verifies that the package can be imported successfully
    // Type-only exports will be checked by TypeScript compiler
    const exports = Object.keys(OrchestratorPackage);

    expect(exports).toContain("OrchestratorService");
    expect(exports).toContain("makeOrchestratorService");
    expect(exports).toContain("planProject");
    expect(exports).toContain("ProfessorOakOrchestrator");
    expect(exports).toContain("LLMTask");
    expect(exports).toContain("makeConfigError");
    expect(exports).toContain("OrchestratorStateAnnotation");
  });

  test.concurrent("legacy orchestrator should be instantiable", async () => {
    const orchestrator = new OrchestratorPackage.ProfessorOakOrchestrator({
      openRouterApiKey: "test-key",
    });

    expect(orchestrator).toBeDefined();
    expect(typeof orchestrator.planProject).toBe("function");
    expect(typeof orchestrator.decomposeTask).toBe("function");
    expect(typeof orchestrator.coordinateAgents).toBe("function");
    expect(typeof orchestrator.synthesizeResults).toBe("function");
    expect(typeof orchestrator.optimizeResourceAllocation).toBe("function");
  });

  test.concurrent(
    "should have consistent API between Effect and legacy",
    async () => {
      const service = OrchestratorPackage.makeOrchestratorService({
        openRouterApiKey: "test-key",
      });

      const orchestrator = new OrchestratorPackage.ProfessorOakOrchestrator({
        openRouterApiKey: "test-key",
      });

      // Both should have the same method names
      expect(typeof service.planProject).toBe(typeof orchestrator.planProject);
      expect(typeof service.decomposeTask).toBe(
        typeof orchestrator.decomposeTask,
      );
      expect(typeof service.coordinateAgents).toBe(
        typeof orchestrator.coordinateAgents,
      );
      expect(typeof service.synthesizeResults).toBe(
        typeof orchestrator.synthesizeResults,
      );
      expect(typeof service.optimizeResourceAllocation).toBe(
        typeof orchestrator.optimizeResourceAllocation,
      );
    },
  );
});
