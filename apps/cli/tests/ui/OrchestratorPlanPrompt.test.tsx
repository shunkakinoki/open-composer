import { describe, expect, mock, test } from "bun:test";

import { OrchestratorPlanPrompt } from "../../src/components/OrchestratorPlanPrompt.js";
import { render } from "../utils.js";

describe("OrchestratorPlanPrompt", () => {
  test("renders objective step snapshot by default", () => {
    const onComplete = mock(() => {});
    const onCancel = mock(() => {});

    const { lastFrame } = render(
      <OrchestratorPlanPrompt onComplete={onComplete} onCancel={onCancel} />,
    );

    expect(lastFrame()).toMatchSnapshot();
  });

  test("renders description step snapshot", () => {
    const onComplete = mock(() => {});
    const onCancel = mock(() => {});

    const { lastFrame } = render(
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
  });

  test("renders constraints step snapshot", () => {
    const onComplete = mock(() => {});
    const onCancel = mock(() => {});

    const { lastFrame } = render(
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
  });

  test("renders tech requirements step snapshot", () => {
    const onComplete = mock(() => {});
    const onCancel = mock(() => {});

    const { lastFrame } = render(
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
  });

  test("renders confirm step snapshot", () => {
    const onComplete = mock(() => {});
    const onCancel = mock(() => {});

    const { lastFrame } = render(
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
  });
});
