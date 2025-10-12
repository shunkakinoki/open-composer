import { TextAttributes } from "@opentui/core";

import { useKeyboard } from "@opentui/react"; 
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
    process.exit(0);
  };

  useKeyboard(
    (key) => {
      if (key.name === "escape" || (key.ctrl && key.sequence === "c")) {
        onCancel();
        process.exit(0);
        return;
      }

      switch (step) {
        case "objective":
          if (key.name === "return") {
            if (objective.trim()) {
              setStep("description");
            }
          } else if (key.name === "backspace" || key.name === "delete") {
            setObjective(objective.slice(0, -1));
          } else if (key.sequence && key.sequence.length === 1 && !key.ctrl && !key.meta) {
            setObjective(objective + key.sequence);
          }
          break;

        case "description":
          if (key.name === "return") {
            if (description.trim()) {
              setStep("constraints");
            }
          } else if (key.name === "backspace" || key.name === "delete") {
            setDescription(description.slice(0, -1));
          } else if (key.sequence && key.sequence.length === 1 && !key.ctrl && !key.meta) {
            setDescription(description + key.sequence);
          }
          break;

        case "constraints":
          if (key.name === "return") {
            setStep("tech-requirements");
          } else if (key.name === "backspace" || key.name === "delete") {
            setConstraints(constraints.slice(0, -1));
          } else if (key.sequence && key.sequence.length === 1 && !key.ctrl && !key.meta) {
            setConstraints(constraints + key.sequence);
          }
          break;

        case "tech-requirements":
          if (key.name === "return") {
            setStep("confirm");
          } else if (key.name === "backspace" || key.name === "delete") {
            setTechRequirements(techRequirements.slice(0, -1));
          } else if (key.sequence && key.sequence.length === 1 && !key.ctrl && !key.meta) {
            setTechRequirements(techRequirements + key.sequence);
          }
          break;

        case "confirm":
          if (key.name === "return") {
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
          <box flexDirection="column">
            <text content="🤖 Professor Oak Project Planner" style={{ fg: "cyan", attributes: TextAttributes.BOLD }} />
            <box marginTop={1}>
              <text content="Project objective or goal: " />
              <text content={objective} style={{ fg: "green" }} />
              <text content="_" style={{ fg: "gray" }} />
            </box>
            <box marginTop={1}>
              <text content="Press Enter to continue, Esc to cancel" style={{ fg: "gray" }} />
            </box>
          </box>
        );

      case "description":
        return (
          <box flexDirection="column">
            <text content="📝 Project Description" style={{ fg: "cyan", attributes: TextAttributes.BOLD }} />
            <box marginTop={1}>
              <text content="Detailed description: " />
              <text content={description} style={{ fg: "green" }} />
              <text content="_" style={{ fg: "gray" }} />
            </box>
            <box marginTop={1}>
              <text content="Press Enter to continue, Esc to cancel" style={{ fg: "gray" }} />
            </box>
          </box>
        );

      case "constraints":
        return (
          <box flexDirection="column">
            <text content="⚠️ Constraints" style={{ fg: "cyan", attributes: TextAttributes.BOLD }} />
            <box marginTop={1}>
              <text content="Constraints (comma-separated, optional): " />
              <text content={constraints} style={{ fg: "green" }} />
              <text content="_" style={{ fg: "gray" }} />
            </box>
            <box marginTop={1}>
              <text content="Examples: TypeScript,React,Must have tests" style={{ fg: "gray" }} />
            </box>
            <box marginTop={1}>
              <text content="Press Enter to continue (or skip), Esc to cancel" style={{ fg: "gray" }} />
            </box>
          </box>
        );

      case "tech-requirements":
        return (
          <box flexDirection="column">
            <text content="🔧 Technical Requirements" style={{ fg: "cyan", attributes: TextAttributes.BOLD }} />
            <box marginTop={1}>
              <text content="Tech requirements (comma-separated, optional): " />
              <text content={techRequirements} style={{ fg: "green" }} />
              <text content="_" style={{ fg: "gray" }} />
            </box>
            <box marginTop={1}>
              <text content="Examples: PostgreSQL,REST API,Docker" style={{ fg: "gray" }} />
            </box>
            <box marginTop={1}>
              <text content="Press Enter to continue (or skip), Esc to cancel" style={{ fg: "gray" }} />
            </box>
          </box>
        );

      case "confirm":
        return (
          <box flexDirection="column">
            <text content="✅ Confirm Project Plan Request" style={{ fg: "cyan", attributes: TextAttributes.BOLD }} />
            <box marginTop={1}>
              <text content={`Objective: ${objective.trim()}`} />
            </box>
            <box marginTop={1}>
              <text content={`Description: ${description.trim()}`} />
            </box>
            {constraints.trim() && (
              <box marginTop={1}>
                <text
                  content={`Constraints: ${constraints.split(",").map((s) => s.trim()).join(", ")}`}
                  style={{ fg: "yellow" }}
                />
              </box>
            )}
            {techRequirements.trim() && (
              <box marginTop={1}>
                <text
                  content={`Tech Requirements: ${techRequirements.split(",").map((s) => s.trim()).join(", ")}`}
                  style={{ fg: "yellow" }}
                />
              </box>
            )}
            <box marginTop={2}>
              <text content="Press Enter to generate plan, Esc to cancel" style={{ fg: "gray" }} />
            </box>
          </box>
        );
    }
  };

  return (
    <box flexDirection="column" padding={2}>
      {renderStep()}
    </box>
  );
};
