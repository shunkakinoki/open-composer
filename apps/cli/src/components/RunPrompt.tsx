import { Box, Text, useApp, useInput } from "ink";
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
  const { exit } = useApp();

  const handleComplete = () => {
    const config: RunConfig = {
      description,
      agent: selectedAgent || availableAgents[0], // default to first agent if none selected
      baseBranch: baseBranch.trim() || "main",
      createPR,
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
        case "agent":
          if (key.upArrow) {
            setCurrentAgentIndex((prev) =>
              prev > 0 ? prev - 1 : availableAgents.length - 1,
            );
          } else if (key.downArrow) {
            setCurrentAgentIndex((prev) =>
              prev < availableAgents.length - 1 ? prev + 1 : 0,
            );
          } else if (key.return) {
            setSelectedAgent(availableAgents[currentAgentIndex]);
            setStep("base-branch");
          }
          break;

        case "base-branch":
          if (key.return) {
            setStep("create-pr");
          } else if (key.backspace || key.delete) {
            setBaseBranch(baseBranch.slice(0, -1));
          } else if (input && !key.ctrl && !key.meta) {
            setBaseBranch(baseBranch + input);
          }
          break;

        case "create-pr":
          if (
            key.leftArrow ||
            key.rightArrow ||
            input.toLowerCase() === "y" ||
            input.toLowerCase() === "n"
          ) {
            setCreatePR(!createPR);
          } else if (key.return) {
            setStep("confirm");
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
      case "agent":
        return (
          <Box flexDirection="column">
            <Text bold color="cyan">
              🚀 Run Task: {description}
            </Text>
            <Text color="gray">Select an AI agent to execute this task:</Text>
            <Box marginTop={1} flexDirection="column">
              {availableAgents.map((agent, index) => (
                <Box key={agent}>
                  <Text
                    color={index === currentAgentIndex ? "yellow" : "white"}
                  >
                    {index === currentAgentIndex ? "→ " : "  "} {agent}
                  </Text>
                </Box>
              ))}
            </Box>
            <Box marginTop={1}>
              <Text color="gray">
                Use ↑↓ to navigate, Enter to select, Esc to cancel
              </Text>
            </Box>
          </Box>
        );

      case "base-branch":
        return (
          <Box flexDirection="column">
            <Text bold color="cyan">
              🌿 Base Branch
            </Text>
            <Box marginTop={1}>
              <Text>select the branch to branch from: </Text>
              <Text color="green">{baseBranch}</Text>
              <Text color="gray">_</Text>
            </Box>
            <Box marginTop={1}>
              <Text color="gray">
                Press Enter to continue (default: main), Esc to cancel
              </Text>
            </Box>
          </Box>
        );

      case "create-pr":
        return (
          <Box flexDirection="column">
            <Text bold color="cyan">
              🔗 Create PR
            </Text>
            <Box marginTop={1}>
              <Text>Create a PR for this task?</Text>
            </Box>
            <Box marginTop={1}>
              <Text color={createPR ? "green" : "red"}>
                {createPR ? "[x] Yes" : "[ ] No"}
              </Text>
            </Box>
            <Box marginTop={1}>
              <Text color="gray">
                Use ←→ or Y/N to toggle, Enter to confirm, Esc to cancel
              </Text>
            </Box>
          </Box>
        );

      case "confirm":
        return (
          <Box flexDirection="column">
            <Text bold color="cyan">
              ✅ Confirm Run Configuration
            </Text>
            <Box marginTop={1}>
              <Text>
                Task: <Text color="yellow">{description}</Text>
              </Text>
            </Box>
            <Box marginTop={1}>
              <Text>
                Agent:{" "}
                <Text color="green">{selectedAgent || availableAgents[0]}</Text>
              </Text>
            </Box>
            <Box marginTop={1}>
              <Text>
                Base Branch:{" "}
                <Text color="yellow">{baseBranch.trim() || "main"}</Text>
              </Text>
            </Box>
            <Box marginTop={1}>
              <Text>
                Create PR:{" "}
                <Text color={createPR ? "green" : "red"}>
                  {createPR ? "Yes" : "No"}
                </Text>
              </Text>
            </Box>
            <Box marginTop={2}>
              <Text color="gray">Press Enter to run, Esc to cancel</Text>
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
