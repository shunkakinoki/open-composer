import { Box, Text, useApp, useInput } from "ink";
import type React from "react";
import { useState } from "react";
import { AVAILABLE_AGENTS } from "../commands/spawn-command.js";

type Step = "session-name" | "agents" | "base-branch" | "create-pr" | "confirm";

interface SpawnPromptProps {
  onComplete: (config: SpawnConfig) => void;
  onCancel: () => void;
}

export interface SpawnConfig {
  sessionName: string;
  agents: string[];
  baseBranch: string;
  createPR: boolean;
}

export const SpawnPrompt: React.FC<SpawnPromptProps> = ({
  onComplete,
  onCancel,
}) => {
  const [step, setStep] = useState<Step>("session-name");
  const [sessionName, setSessionName] = useState("");
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [baseBranch, setBaseBranch] = useState("main");
  const [createPR, setCreatePR] = useState(false);
  const [currentAgentIndex, setCurrentAgentIndex] = useState(0);
  const { exit } = useApp();

  const toggleAgent = (agent: string) => {
    setSelectedAgents((prev) =>
      prev.includes(agent) ? prev.filter((a) => a !== agent) : [...prev, agent],
    );
  };

  const handleComplete = () => {
    const finalSessionName = sessionName.trim() || `spawn-${Date.now()}`;

    const config: SpawnConfig = {
      sessionName: finalSessionName,
      agents: selectedAgents.length > 0 ? selectedAgents : ["codex"], // default to codex if none selected
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
        case "session-name":
          if (key.return) {
            setStep("agents");
          } else if (key.backspace || key.delete) {
            setSessionName(sessionName.slice(0, -1));
          } else if (input && !key.ctrl && !key.meta) {
            setSessionName(sessionName + input);
          }
          break;

        case "agents":
          if (input === " ") {
            const agent = AVAILABLE_AGENTS[currentAgentIndex];
            toggleAgent(agent);
          } else if (key.upArrow) {
            setCurrentAgentIndex((prev) =>
              prev > 0 ? prev - 1 : AVAILABLE_AGENTS.length - 1,
            );
          } else if (key.downArrow) {
            setCurrentAgentIndex((prev) =>
              prev < AVAILABLE_AGENTS.length - 1 ? prev + 1 : 0,
            );
          } else if (key.return) {
            setStep("base-branch");
          }
          break;

        case "base-branch":
          if (key.return) {
            if (baseBranch.trim()) {
              setStep("create-pr");
            }
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
      case "session-name":
        return (
          <Box flexDirection="column">
            <Text bold color="cyan">
              🪄 Spawn Interactive Session
            </Text>
            <Box marginTop={1}>
              <Text>name for the session: </Text>
              <Text color="green">{sessionName}</Text>
              <Text color="gray">_</Text>
            </Box>
            <Box marginTop={1}>
              <Text color="gray">
                Press Enter to continue (auto-generated if empty), Esc to cancel
              </Text>
            </Box>
          </Box>
        );

      case "agents":
        return (
          <Box flexDirection="column">
            <Text bold color="cyan">
              🤖 Select Agents
            </Text>
            <Box marginTop={1}>
              <Text>
                Select one or multiple coding agents: (use space to select,
                enter to confirm)
              </Text>
            </Box>
            <Box marginTop={1} flexDirection="column">
              {AVAILABLE_AGENTS.map((agent, index) => (
                <Box key={agent}>
                  <Text
                    color={selectedAgents.includes(agent) ? "green" : "gray"}
                  >
                    {selectedAgents.includes(agent) ? "[x]" : "[ ]"} {agent}
                    {index === currentAgentIndex && (
                      <Text color="yellow"> ←</Text>
                    )}
                  </Text>
                </Box>
              ))}
            </Box>
            <Box marginTop={1}>
              <Text color="gray">
                Use ↑↓ to navigate, Space to toggle, Enter to confirm, Esc to
                cancel
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
              🔗 Create PRs
            </Text>
            <Box marginTop={1}>
              <Text>Create PRs for spawned worktrees?</Text>
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
              ✅ Confirm Spawn Configuration
            </Text>
            <Box marginTop={1}>
              <Text>
                Session Name:{" "}
                <Text color="green">
                  {sessionName.trim() || `spawn-${Date.now()}`}
                </Text>
              </Text>
            </Box>
            <Box marginTop={1}>
              <Text>
                Agents:{" "}
                <Text color="yellow">
                  {selectedAgents.length > 0
                    ? selectedAgents.join(", ")
                    : "codex"}
                </Text>
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
                Create PRs:{" "}
                <Text color={createPR ? "green" : "red"}>
                  {createPR ? "Yes" : "No"}
                </Text>
              </Text>
            </Box>
            <Box marginTop={2}>
              <Text color="gray">Press Enter to spawn, Esc to cancel</Text>
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
