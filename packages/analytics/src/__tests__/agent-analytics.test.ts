import { expect, test } from "bun:test";
import { AgentAnalytics } from "../agent-analytics.js";

test("AgentAnalytics exports correctly", () => {
  expect(AgentAnalytics).toBeDefined();
  expect(AgentAnalytics.updateAgentPerformance).toBeDefined();
  expect(AgentAnalytics.calculateStats).toBeDefined();
  expect(AgentAnalytics.getAgentPerformanceSummary).toBeDefined();
  expect(AgentAnalytics.compareAgentPerformance).toBeDefined();
});
