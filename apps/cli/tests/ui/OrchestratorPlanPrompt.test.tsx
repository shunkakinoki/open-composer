import { describe, expect, mock, test } from "bun:test";

import { OrchestratorPlanPrompt } from "../../src/components/OrchestratorPlanPrompt.js";
import { render } from "../utils.js";

describe("OrchestratorPlanPrompt", () => {
  test("renders objective step snapshot by default", async () => {
    const onComplete = mock(() => {});
    const onCancel = mock(() => {});

    const { lastFrame, cleanup } = await render(
      <OrchestratorPlanPrompt onComplete={onComplete} onCancel={onCancel} />,
    );

    expect(lastFrame()).toMatchSnapshot();
    cleanup();
  });

  test("renders description step snapshot", async () => {
    const onComplete = mock(() => {});
    const onCancel = mock(() => {});

    const { lastFrame, cleanup } = await render(
      <OrchestratorPlanPrompt
        onComplete={onComplete}
        onCancel={onCancel}
        initialState={{
          step: "description",
          objective: "Launch new CLI tool",
          description: "Plan execution strategy",
        }}
      />,
    );

    expect(lastFrame()).toMatchSnapshot();
    cleanup();
  });

  test("renders constraints step snapshot", async () => {
    const onComplete = mock(() => {});
    const onCancel = mock(() => {});

    const { lastFrame, cleanup } = await render(
      <OrchestratorPlanPrompt
        onComplete={onComplete}
        onCancel={onCancel}
        initialState={{
          step: "constraints",
          objective: "Launch new CLI tool",
          description: "Plan execution strategy",
          constraints: "TypeScript,React,Must include docs",
        }}
      />,
    );

    expect(lastFrame()).toMatchSnapshot();
    cleanup();
  });

  test("renders tech requirements step snapshot", async () => {
    const onComplete = mock(() => {});
    const onCancel = mock(() => {});

    const { lastFrame, cleanup } = await render(
      <OrchestratorPlanPrompt
        onComplete={onComplete}
        onCancel={onCancel}
        initialState={{
          step: "tech-requirements",
          objective: "Launch new CLI tool",
          description: "Plan execution strategy",
          constraints: "TypeScript,React,Must include docs",
          techRequirements: "PostgreSQL,REST API,Docker",
        }}
      />,
    );

    expect(lastFrame()).toMatchSnapshot();
    cleanup();
  });

  test("renders confirm step snapshot", async () => {
    const onComplete = mock(() => {});
    const onCancel = mock(() => {});

    const { lastFrame, cleanup } = await render(
      <OrchestratorPlanPrompt
        onComplete={onComplete}
        onCancel={onCancel}
        initialState={{
          step: "confirm",
          objective: "Launch new CLI tool",
          description: "Plan execution strategy",
          constraints: "TypeScript,React,Must include docs",
          techRequirements: "PostgreSQL,REST API,Docker",
        }}
      />,
    );

    expect(lastFrame()).toMatchSnapshot();
    cleanup();
  });
});
