import { TextAttributes } from "@opentui/core";

import { useKeyboard } from "@opentui/react"; 
import type React from "react";
import { useState } from "react";

type Step = "session-name" | "agents" | "base-branch" | "create-pr" | "confirm";

interface SpawnPromptProps {
  availableAgents: readonly string[];
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
  availableAgents,
  onComplete,
  onCancel,
}) => {
  const [step, setStep] = useState<Step>("session-name");
  const [sessionName, setSessionName] = useState("");
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [baseBranch, setBaseBranch] = useState("main");
  const [createPR, setCreatePR] = useState(false);
  const [currentAgentIndex, setCurrentAgentIndex] = useState(0);
  

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
        case "session-name":
          if (key.name === "return") {
            setStep("agents");
          } else if (key.name === "backspace" || key.name === "delete") {
            setSessionName(sessionName.slice(0, -1));
          } else if (key.sequence && key.sequence.length === 1 && !key.ctrl && !key.meta) {
            setSessionName(sessionName + key.sequence);
          }
          break;

        case "agents":
          if (key.sequence === " ") {
            const agent = availableAgents[currentAgentIndex];
            toggleAgent(agent);
          } else if (key.name === "up") {
            setCurrentAgentIndex((prev) =>
              prev > 0 ? prev - 1 : availableAgents.length - 1,
            );
          } else if (key.name === "down") {
            setCurrentAgentIndex((prev) =>
              prev < availableAgents.length - 1 ? prev + 1 : 0,
            );
          } else if (key.name === "return") {
            setStep("base-branch");
          }
          break;

        case "base-branch":
          if (key.name === "return") {
            if (baseBranch.trim()) {
              setStep("create-pr");
            }
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
      case "session-name":
        return (
          <box flexDirection="column">
            <text content="🪄 Spawn Interactive Session" style={{ fg: "cyan", attributes: TextAttributes.BOLD }} />
            <box marginTop={1}>
              <text content="name for the session: " />
              <text content={sessionName} style={{ fg: "green" }} />
              <text content="_" style={{ fg: "gray" }} />
            </box>
            <box marginTop={1}>
              <text content="Press Enter to continue (auto-generated if empty), Esc to cancel" style={{ fg: "gray" }} />
            </box>
          </box>
        );

      case "agents":
        return (
          <box flexDirection="column">
            <text content="🤖 Select Agents" style={{ fg: "cyan", attributes: TextAttributes.BOLD }} />
            <box marginTop={1}>
              <text content="Select one or multiple coding agents: (use space to select, enter to confirm)" />
            </box>
            <box marginTop={1} flexDirection="column">
              {availableAgents.map((agent, index) => {
                const checkbox = selectedAgents.includes(agent) ? "[x]" : "[ ]";
                const arrow = index === currentAgentIndex ? " ←" : "";
                return (
                  <box key={agent}>
                    <text
                      content={`${checkbox} ${agent}${arrow}`}
                      style={{ fg: selectedAgents.includes(agent) ? "green" : (index === currentAgentIndex ? "yellow" : "gray") }}
                    />
                  </box>
                );
              })}
            </box>
            <box marginTop={1}>
              <text content="Use ↑↓ to navigate, Space to toggle, Enter to confirm, Esc to cancel" style={{ fg: "gray" }} />
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
            <text content="🔗 Create PRs" style={{ fg: "cyan", attributes: TextAttributes.BOLD }} />
            <box marginTop={1}>
              <text content="Create PRs for spawned worktrees?" />
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
            <text content="✅ Confirm Spawn Configuration" style={{ fg: "cyan", attributes: TextAttributes.BOLD }} />
            <box marginTop={1}>
              <text content={`Session Name: ${sessionName.trim() || `spawn-${Date.now()}`}`} />
            </box>
            <box marginTop={1}>
              <text content={`Agents: ${selectedAgents.length > 0 ? selectedAgents.join(", ") : "codex"}`} />
            </box>
            <box marginTop={1}>
              <text content={`Base Branch: ${baseBranch.trim() || "main"}`} />
            </box>
            <box marginTop={1}>
              <text content={`Create PRs: ${createPR ? "Yes" : "No"}`} />
            </box>
            <box marginTop={2}>
              <text content="Press Enter to spawn, Esc to cancel" style={{ fg: "gray" }} />
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
