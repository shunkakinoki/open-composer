import { DatabaseLive } from "@open-composer/db";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import * as Effect from "effect/Effect";
import type React from "react";
import { useState } from "react";
import { RunService } from "../services/run-service.js";

/**
 * Interactive React component for creating development runs.
 *
 * Only prompts for information that wasn't provided via props:
 * - If initialName is not provided, prompts for run name
 * - If initialWorkspaceChoice is not provided, prompts for workspace choice
 * - If workspace choice requires a path and initialWorkspacePath is not provided, prompts for path
 * - Otherwise, shows confirmation and allows immediate creation
 *
 * @example
 * // Prompt for everything
 * <RunCreatePrompt onComplete={(id) => console.log(`Created run ${id}`)} />
 *
 * @example
 * // Only prompt for workspace choice and path
 * <RunCreatePrompt
 *   initialName="My Project"
 *   onComplete={(id) => console.log(`Created run ${id}`)}
 * />
 *
 * @example
 * // Only prompt for workspace path
 * <RunCreatePrompt
 *   initialName="My Project"
 *   initialWorkspaceChoice="existing"
 *   onComplete={(id) => console.log(`Created run ${id}`)}
 * />
 *
 * @example
 * // No prompts - direct confirmation
 * <RunCreatePrompt
 *   initialName="My Project"
 *   initialWorkspaceChoice="none"
 *   onComplete={(id) => console.log(`Created run ${id}`)}
 * />
 */

type WorkspaceChoice = "existing" | "create" | "none";
type Step = "name" | "workspace-choice" | "workspace-path" | "confirm";

interface RunCreatePromptProps {
  initialName?: string;
  initialWorkspaceChoice?: "existing" | "create" | "none";
  initialWorkspacePath?: string;
  onComplete: (runId: number) => void;
  onCancel?: () => void;
}

export const RunCreatePrompt: React.FC<RunCreatePromptProps> = ({
  initialName,
  initialWorkspaceChoice,
  initialWorkspacePath,
  onComplete,
  onCancel,
}) => {
  // Determine initial step based on provided arguments
  const getInitialStep = (): Step => {
    if (!initialName) return "name";
    if (!initialWorkspaceChoice) return "workspace-choice";
    if (
      (initialWorkspaceChoice === "existing" ||
        initialWorkspaceChoice === "create") &&
      !initialWorkspacePath
    )
      return "workspace-path";
    return "confirm";
  };

  const [step, setStep] = useState<Step>(getInitialStep());
  const [runName, setRunName] = useState(initialName || "");
  const [workspaceChoice, setWorkspaceChoice] = useState<WorkspaceChoice>(
    initialWorkspaceChoice || "existing",
  );
  const [workspacePath, setWorkspacePath] = useState(
    initialWorkspacePath || "",
  );
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateRun = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const cli = new RunService();
      const runId = await cli
        .createInteractive(runName, workspaceChoice, workspacePath)
        .pipe(Effect.provide(DatabaseLive), Effect.runPromise);
      onComplete(runId);
      process.exit(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create run");
      setIsCreating(false);
    }
  };

  useKeyboard((key) => {
      if (isCreating) return;

      if (key.name === "escape" || (key.ctrl && key.name === "c")) {
        onCancel?.();
        process.exit(0);
        return;
      }

      switch (step) {
        case "name":
          if (key.name === "return") {
            if (runName.trim()) {
              setStep("workspace-choice");
            } else {
              setRunName(`Run ${Date.now()}`);
              setStep("workspace-choice");
            }
          } else if (key.name === "backspace" || key.name === "delete") {
            setRunName(runName.slice(0, -1));
          } else if (key.sequence && key.sequence.length === 1 && !key.ctrl && !key.meta) {
            setRunName(runName + key.sequence);
          }
          break;

        case "workspace-choice":
          if (key.name === "up" || key.name === "down") {
            const choices: WorkspaceChoice[] = ["existing", "create", "none"];
            const currentIndex = choices.indexOf(workspaceChoice);
            const nextIndex = key.name === "up"
              ? (currentIndex - 1 + choices.length) % choices.length
              : (currentIndex + 1) % choices.length;
            setWorkspaceChoice(choices[nextIndex]);
          } else if (key.name === "return") {
            if (workspaceChoice === "none") {
              setStep("confirm");
            } else {
              setStep("workspace-path");
            }
          }
          break;

        case "workspace-path":
          if (key.name === "return") {
            if (workspacePath.trim()) {
              setStep("confirm");
            }
          } else if (key.name === "backspace" || key.name === "delete") {
            setWorkspacePath(workspacePath.slice(0, -1));
          } else if (key.sequence && key.sequence.length === 1 && !key.ctrl && !key.meta) {
            setWorkspacePath(workspacePath + key.sequence);
          }
          break;

        case "confirm":
          if (key.name === "return") {
            handleCreateRun();
          }
          break;
      }
    }
  );

  const renderStep = () => {
    switch (step) {
      case "name":
        return (
          <box style={{ flexDirection: "column" }}>
            <text content="🎯 Create New Run" style={{ fg: "cyan", attributes: TextAttributes.BOLD }} />
            <box style={{ marginTop: 1 }}>
              <text content="Enter run name (press Enter for auto-generated):" />
            </box>
            <box style={{ marginTop: 1 }}>
              <text content={runName} style={{ fg: "green" }} />
              <text content="_" style={{ fg: "gray" }} />
            </box>
            <box style={{ marginTop: 1 }}>
              <text content="Press Enter to continue, Esc to cancel" style={{ fg: "gray" }} />
            </box>
          </box>
        );

      case "workspace-choice":
        return (
          <box style={{ flexDirection: "column" }}>
            <text content="📁 Choose Workspace Option" style={{ fg: "cyan", attributes: TextAttributes.BOLD }} />
            <box style={{ marginTop: 1 }}>
              <text content="Choose workspace option:" />
            </box>
            <box style={{ flexDirection: "column", marginTop: 1 }}>
              <box>
                <text
                  content={`${workspaceChoice === "existing" ? "●" : "○"} 1. Use existing git workspace`}
                  style={{ fg: workspaceChoice === "existing" ? "green" : "gray" }}
                />
              </box>
              <box style={{ marginTop: 1 }}>
                <text
                  content={`${workspaceChoice === "create" ? "●" : "○"} 2. Create new workspace`}
                  style={{ fg: workspaceChoice === "create" ? "green" : "gray" }}
                />
              </box>
              <box style={{ marginTop: 1 }}>
                <text
                  content={`${workspaceChoice === "none" ? "●" : "○"} 3. No workspace (just run tracking)`}
                  style={{ fg: workspaceChoice === "none" ? "green" : "gray" }}
                />
              </box>
            </box>
            <box style={{ marginTop: 2 }}>
              <text content="Use ↑↓ to select, Enter to confirm, Esc to cancel" style={{ fg: "gray" }} />
            </box>
          </box>
        );

      case "workspace-path": {
        const placeholder =
          workspaceChoice === "existing"
            ? "Enter path to existing git workspace"
            : "Enter path for new workspace";

        return (
          <box style={{ flexDirection: "column" }}>
            <text
              content={`📂 ${workspaceChoice === "existing" ? "Select Existing" : "Create New"} Workspace`}
              style={{ fg: "cyan", attributes: TextAttributes.BOLD }}
            />
            <box style={{ marginTop: 1 }}>
              <text content={`${placeholder}:`} />
            </box>
            <box style={{ marginTop: 1 }}>
              <text content={workspacePath} style={{ fg: "yellow" }} />
              <text content="_" style={{ fg: "gray" }} />
            </box>
            <box style={{ marginTop: 1 }}>
              <text content="Press Enter to continue, Esc to cancel" style={{ fg: "gray" }} />
            </box>
          </box>
        );
      }

      case "confirm":
        return (
          <box style={{ flexDirection: "column" }}>
            <text content="✅ Confirm Run Creation" style={{ fg: "cyan", attributes: TextAttributes.BOLD }} />
            <box style={{ marginTop: 1 }}>
              <text content="Run Name: " />
              <text content={runName} style={{ fg: "green" }} />
            </box>
            <box style={{ marginTop: 1 }}>
              <text content="Workspace: " />
              {workspaceChoice === "none" ? (
                <text content="No workspace assigned" style={{ fg: "gray" }} />
              ) : (
                <text content={workspacePath} style={{ fg: "yellow" }} />
              )}
            </box>
            <box style={{ marginTop: 2 }}>
              <text content="Press Enter to create run, Esc to cancel" style={{ fg: "gray" }} />
            </box>
            {error && (
              <box style={{ marginTop: 1 }}>
                <text content={`❌ ${error}`} style={{ fg: "red" }} />
              </box>
            )}
          </box>
        );
    }
  };

  if (isCreating) {
    return (
      <box style={{ flexDirection: "column", padding: 2 }}>
        <text content="🔄 Creating Run..." style={{ fg: "cyan", attributes: TextAttributes.BOLD }} />
        <box style={{ marginTop: 1 }}>
          <text content="Please wait while we set up your run." />
        </box>
      </box>
    );
  }

  return (
    <box style={{ flexDirection: "column", padding: 2 }}>
      {renderStep()}
    </box>
  );
};
