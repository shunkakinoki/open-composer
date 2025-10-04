import { Box, Text, useApp, useInput } from "ink";
import type React from "react";
import { useState } from "react";

type Step =
  | "objective"
  | "description"
  | "constraints"
  | "tech-requirements"
  | "confirm";

interface OrchestratorPlanInitialState {
  step?: Step;
  objective?: string;
  description?: string;
  constraints?: string;
  techRequirements?: string;
}

interface OrchestratorPlanPromptProps {
  onComplete: (config: OrchestratorPlanConfig) => void;
  onCancel: () => void;
  initialState?: OrchestratorPlanInitialState;
}

export interface OrchestratorPlanConfig {
  objective: string;
  description: string;
  constraints?: string[];
  technicalRequirements?: string[];
}

export const OrchestratorPlanPrompt: React.FC<OrchestratorPlanPromptProps> = ({
  onComplete,
  onCancel,
  initialState,
}) => {
  const {
    step: initialStep = "objective",
    objective: initialObjective = "",
    description: initialDescription = "",
    constraints: initialConstraints = "",
    techRequirements: initialTechRequirements = "",
  } = initialState ?? {};

  const [step, setStep] = useState<Step>(initialStep);
  const [objective, setObjective] = useState(initialObjective);
  const [description, setDescription] = useState(initialDescription);
  const [constraints, setConstraints] = useState(initialConstraints);
  const [techRequirements, setTechRequirements] = useState(
    initialTechRequirements,
  );
  const { exit } = useApp();

  const handleComplete = () => {
    const config: OrchestratorPlanConfig = {
      objective: objective.trim(),
      description: description.trim(),
      constraints:
        constraints.trim().length > 0
          ? constraints.split(",").map((s) => s.trim())
          : undefined,
      technicalRequirements:
        techRequirements.trim().length > 0
          ? techRequirements.split(",").map((s) => s.trim())
          : undefined,
    };

    onComplete(config);
    exit();
  };

  useInput(
    (input, key) => {
      if (key.escape || (key.ctrl && input === "c")) {
        onCancel();
        exit();
        return;
      }

      switch (step) {
        case "objective":
          if (key.return) {
            if (objective.trim()) {
              setStep("description");
            }
          } else if (key.backspace || key.delete) {
            setObjective(objective.slice(0, -1));
          } else if (input && !key.ctrl && !key.meta) {
            setObjective(objective + input);
          }
          break;

        case "description":
          if (key.return) {
            if (description.trim()) {
              setStep("constraints");
            }
          } else if (key.backspace || key.delete) {
            setDescription(description.slice(0, -1));
          } else if (input && !key.ctrl && !key.meta) {
            setDescription(description + input);
          }
          break;

        case "constraints":
          if (key.return) {
            setStep("tech-requirements");
          } else if (key.backspace || key.delete) {
            setConstraints(constraints.slice(0, -1));
          } else if (input && !key.ctrl && !key.meta) {
            setConstraints(constraints + input);
          }
          break;

        case "tech-requirements":
          if (key.return) {
            setStep("confirm");
          } else if (key.backspace || key.delete) {
            setTechRequirements(techRequirements.slice(0, -1));
          } else if (input && !key.ctrl && !key.meta) {
            setTechRequirements(techRequirements + input);
          }
          break;

        case "confirm":
          if (key.return) {
            handleComplete();
          }
          break;
      }
    },
    { isActive: true },
  );

  const renderStep = () => {
    switch (step) {
      case "objective":
        return (
          <Box flexDirection="column">
            <Text bold color="cyan">
              🤖 Professor Oak Project Planner
            </Text>
            <Box marginTop={1}>
              <Text>Project objective or goal: </Text>
              <Text color="green">{objective}</Text>
              <Text color="gray">_</Text>
            </Box>
            <Box marginTop={1}>
              <Text color="gray">Press Enter to continue, Esc to cancel</Text>
            </Box>
          </Box>
        );

      case "description":
        return (
          <Box flexDirection="column">
            <Text bold color="cyan">
              📝 Project Description
            </Text>
            <Box marginTop={1}>
              <Text>Detailed description: </Text>
              <Text color="green">{description}</Text>
              <Text color="gray">_</Text>
            </Box>
            <Box marginTop={1}>
              <Text color="gray">Press Enter to continue, Esc to cancel</Text>
            </Box>
          </Box>
        );

      case "constraints":
        return (
          <Box flexDirection="column">
            <Text bold color="cyan">
              ⚠️ Constraints
            </Text>
            <Box marginTop={1}>
              <Text>Constraints (comma-separated, optional): </Text>
              <Text color="green">{constraints}</Text>
              <Text color="gray">_</Text>
            </Box>
            <Box marginTop={1}>
              <Text color="gray">
                Examples: TypeScript,React,Must have tests
              </Text>
            </Box>
            <Box marginTop={1}>
              <Text color="gray">
                Press Enter to continue (or skip), Esc to cancel
              </Text>
            </Box>
          </Box>
        );

      case "tech-requirements":
        return (
          <Box flexDirection="column">
            <Text bold color="cyan">
              🔧 Technical Requirements
            </Text>
            <Box marginTop={1}>
              <Text>Tech requirements (comma-separated, optional): </Text>
              <Text color="green">{techRequirements}</Text>
              <Text color="gray">_</Text>
            </Box>
            <Box marginTop={1}>
              <Text color="gray">Examples: PostgreSQL,REST API,Docker</Text>
            </Box>
            <Box marginTop={1}>
              <Text color="gray">
                Press Enter to continue (or skip), Esc to cancel
              </Text>
            </Box>
          </Box>
        );

      case "confirm":
        return (
          <Box flexDirection="column">
            <Text bold color="cyan">
              ✅ Confirm Project Plan Request
            </Text>
            <Box marginTop={1}>
              <Text>
                Objective: <Text color="yellow">{objective.trim()}</Text>
              </Text>
            </Box>
            <Box marginTop={1}>
              <Text>
                Description: <Text color="yellow">{description.trim()}</Text>
              </Text>
            </Box>
            {constraints.trim() && (
              <Box marginTop={1}>
                <Text>
                  Constraints:{" "}
                  <Text color="yellow">
                    {constraints
                      .split(",")
                      .map((s) => s.trim())
                      .join(", ")}
                  </Text>
                </Text>
              </Box>
            )}
            {techRequirements.trim() && (
              <Box marginTop={1}>
                <Text>
                  Tech Requirements:{" "}
                  <Text color="yellow">
                    {techRequirements
                      .split(",")
                      .map((s) => s.trim())
                      .join(", ")}
                  </Text>
                </Text>
              </Box>
            )}
            <Box marginTop={2}>
              <Text color="gray">
                Press Enter to generate plan, Esc to cancel
              </Text>
            </Box>
          </Box>
        );
    }
  };

  return (
    <Box flexDirection="column" padding={2}>
      {renderStep()}
    </Box>
  );
};
