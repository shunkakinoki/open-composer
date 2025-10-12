import { TextAttributes } from "@opentui/core";

import { useKeyboard } from "@opentui/react"; 
import type React from "react";
import { useState } from "react";

type Step = "agent" | "base-branch" | "create-pr" | "confirm";

interface RunPromptProps {
  description: string;
  availableAgents: readonly string[];
  baseBranch: string;
  createPR: boolean;
  onComplete: (config: RunConfig) => void;
  onCancel: () => void;
}

export interface RunConfig {
  description: string;
  agent: string;
  baseBranch: string;
  createPR: boolean;
}

export const RunPrompt: React.FC<RunPromptProps> = ({
  description,
  availableAgents,
  baseBranch: initialBaseBranch,
  createPR: initialCreatePR,
  onComplete,
  onCancel,
}) => {
  const [step, setStep] = useState<Step>("agent");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [baseBranch, setBaseBranch] = useState(initialBaseBranch);
  const [createPR, setCreatePR] = useState(initialCreatePR);
  const [currentAgentIndex, setCurrentAgentIndex] = useState(0);
  

  const handleComplete = () => {
    const config: RunConfig = {
      description,
      agent: selectedAgent || availableAgents[0], // default to first agent if none selected
      baseBranch: baseBranch.trim() || "main",
      createPR,
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
        case "agent":
          if (key.name === "up") {
            setCurrentAgentIndex((prev) =>
              prev > 0 ? prev - 1 : availableAgents.length - 1,
            );
          } else if (key.name === "down") {
            setCurrentAgentIndex((prev) =>
              prev < availableAgents.length - 1 ? prev + 1 : 0,
            );
          } else if (key.name === "return") {
            setSelectedAgent(availableAgents[currentAgentIndex]);
            setStep("base-branch");
          }
          break;

        case "base-branch":
          if (key.name === "return") {
            setStep("create-pr");
          } else if (key.name === "backspace" || key.name === "delete") {
            setBaseBranch(baseBranch.slice(0, -1));
          } else if (key.sequence && key.sequence.length === 1 && !key.ctrl && !key.meta) {
            setBaseBranch(baseBranch + key.sequence);
          }
          break;

        case "create-pr":
          if (
            key.name === "left" ||
            key.name === "right" ||
            key.sequence?.toLowerCase() === "y" ||
            key.sequence?.toLowerCase() === "n"
          ) {
            setCreatePR(!createPR);
          } else if (key.name === "return") {
            setStep("confirm");
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
      case "agent":
        return (
          <box flexDirection="column">
            <text content={`🚀 Run Task: ${description}`} style={{ fg: "cyan", attributes: TextAttributes.BOLD }} />
            <text content="Select an AI agent to execute this task:" style={{ fg: "gray" }} />
            <box marginTop={1} flexDirection="column">
              {availableAgents.map((agent, index) => {
                const isSelected = index === currentAgentIndex;
                return (
                  <box key={agent}>
                    <text
                      content={`${isSelected ? "→ " : "  "}${agent}`}
                      style={{ fg: isSelected ? "yellow" : "white" }}
                    />
                  </box>
                );
              })}
            </box>
            <box marginTop={1}>
              <text content="Use ↑↓ to navigate, Enter to select, Esc to cancel" style={{ fg: "gray" }} />
            </box>
          </box>
        );

      case "base-branch":
        return (
          <box flexDirection="column">
            <text content="🌿 Base Branch" style={{ fg: "cyan", attributes: TextAttributes.BOLD }} />
            <box marginTop={1}>
              <text content="select the branch to branch from: " />
              <text content={baseBranch} style={{ fg: "green" }} />
              <text content="_" style={{ fg: "gray" }} />
            </box>
            <box marginTop={1}>
              <text content="Press Enter to continue (default: main), Esc to cancel" style={{ fg: "gray" }} />
            </box>
          </box>
        );

      case "create-pr":
        return (
          <box flexDirection="column">
            <text content="🔗 Create PR" style={{ fg: "cyan", attributes: TextAttributes.BOLD }} />
            <box marginTop={1}>
              <text content="Create a PR for this task?" />
            </box>
            <box marginTop={1}>
              <text
                content={createPR ? "[x] Yes" : "[ ] No"}
                style={{ fg: createPR ? "green" : "red" }}
              />
            </box>
            <box marginTop={1}>
              <text content="Use ←→ or Y/N to toggle, Enter to confirm, Esc to cancel" style={{ fg: "gray" }} />
            </box>
          </box>
        );

      case "confirm":
        return (
          <box flexDirection="column">
            <text content="✅ Confirm Run Configuration" style={{ fg: "cyan", attributes: TextAttributes.BOLD }} />
            <box marginTop={1}>
              <text content={`Task: ${description}`} />
            </box>
            <box marginTop={1}>
              <text content={`Agent: ${selectedAgent || availableAgents[0]}`} style={{ fg: "green" }} />
            </box>
            <box marginTop={1}>
              <text content={`Base Branch: ${baseBranch.trim() || "main"}`} style={{ fg: "yellow" }} />
            </box>
            <box marginTop={1}>
              <text
                content={`Create PR: ${createPR ? "Yes" : "No"}`}
                style={{ fg: createPR ? "green" : "red" }}
              />
            </box>
            <box marginTop={2}>
              <text content="Press Enter to run, Esc to cancel" style={{ fg: "gray" }} />
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
