import { DatabaseLive } from "@open-composer/db";
import * as Effect from "effect/Effect";
import { Box, Text, useApp, useInput } from "ink";
import type React from "react";
import { useState } from "react";
import { SessionsService } from "../services/sessions-service.js";

/**
 * Interactive React component for creating development sessions.
 *
 * Only prompts for information that wasn't provided via props:
 * - If initialName is not provided, prompts for session name
 * - If initialWorkspaceChoice is not provided, prompts for workspace choice
 * - If workspace choice requires a path and initialWorkspacePath is not provided, prompts for path
 * - Otherwise, shows confirmation and allows immediate creation
 *
 * @example
 * // Prompt for everything
 * <SessionCreatePrompt onComplete={(id) => console.log(`Created session ${id}`)} />
 *
 * @example
 * // Only prompt for workspace choice and path
 * <SessionCreatePrompt
 *   initialName="My Project"
 *   onComplete={(id) => console.log(`Created session ${id}`)}
 * />
 *
 * @example
 * // Only prompt for workspace path
 * <SessionCreatePrompt
 *   initialName="My Project"
 *   initialWorkspaceChoice="existing"
 *   onComplete={(id) => console.log(`Created session ${id}`)}
 * />
 *
 * @example
 * // No prompts - direct confirmation
 * <SessionCreatePrompt
 *   initialName="My Project"
 *   initialWorkspaceChoice="none"
 *   onComplete={(id) => console.log(`Created session ${id}`)}
 * />
 */

type WorkspaceChoice = "existing" | "create" | "none";
type Step = "name" | "workspace-choice" | "workspace-path" | "confirm";

interface SessionCreatePromptProps {
  initialName?: string;
  initialWorkspaceChoice?: "existing" | "create" | "none";
  initialWorkspacePath?: string;
  onComplete: (sessionId: number) => void;
  onCancel?: () => void;
}

export const SessionCreatePrompt: React.FC<SessionCreatePromptProps> = ({
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
  const [sessionName, setSessionName] = useState(initialName || "");
  const [workspaceChoice, setWorkspaceChoice] = useState<WorkspaceChoice>(
    initialWorkspaceChoice || "existing",
  );
  const [workspacePath, setWorkspacePath] = useState(
    initialWorkspacePath || "",
  );
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { exit } = useApp();

  const handleCreateSession = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const cli = new SessionsService();
      const sessionId = await cli
        .createInteractive(sessionName, workspaceChoice, workspacePath)
        .pipe(Effect.provide(DatabaseLive), Effect.runPromise);
      onComplete(sessionId);
      exit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
      setIsCreating(false);
    }
  };

  useInput(
    (input, key) => {
      if (isCreating) return;

      if (key.escape || (key.ctrl && input === "c")) {
        onCancel?.();
        exit();
        return;
      }

      switch (step) {
        case "name":
          if (key.return) {
            if (sessionName.trim()) {
              setStep("workspace-choice");
            } else {
              setSessionName(`Session ${Date.now()}`);
              setStep("workspace-choice");
            }
          } else if (key.backspace || key.delete) {
            setSessionName(sessionName.slice(0, -1));
          } else if (input && !key.ctrl && !key.meta) {
            setSessionName(sessionName + input);
          }
          break;

        case "workspace-choice":
          if (key.upArrow || key.downArrow) {
            const choices: WorkspaceChoice[] = ["existing", "create", "none"];
            const currentIndex = choices.indexOf(workspaceChoice);
            const nextIndex = key.upArrow
              ? (currentIndex - 1 + choices.length) % choices.length
              : (currentIndex + 1) % choices.length;
            setWorkspaceChoice(choices[nextIndex]);
          } else if (key.return) {
            if (workspaceChoice === "none") {
              setStep("confirm");
            } else {
              setStep("workspace-path");
            }
          }
          break;

        case "workspace-path":
          if (key.return) {
            if (workspacePath.trim()) {
              setStep("confirm");
            }
          } else if (key.backspace || key.delete) {
            setWorkspacePath(workspacePath.slice(0, -1));
          } else if (input && !key.ctrl && !key.meta) {
            setWorkspacePath(workspacePath + input);
          }
          break;

        case "confirm":
          if (key.return) {
            handleCreateSession();
          }
          break;
      }
    },
    { isActive: true },
  );

  const renderStep = () => {
    switch (step) {
      case "name":
        return (
          <Box flexDirection="column">
            <Text bold color="cyan">
              🎯 Create New Session
            </Text>
            <Box marginTop={1}>
              <Text>Enter session name (press Enter for auto-generated):</Text>
            </Box>
            <Box marginTop={1}>
              <Text color="green">{sessionName}</Text>
              <Text color="gray">_</Text>
            </Box>
            <Box marginTop={1}>
              <Text color="gray">Press Enter to continue, Esc to cancel</Text>
            </Box>
          </Box>
        );

      case "workspace-choice":
        return (
          <Box flexDirection="column">
            <Text bold color="cyan">
              📁 Choose Workspace Option
            </Text>
            <Box marginTop={1}>
              <Text>Choose workspace option:</Text>
            </Box>
            <Box marginTop={1} flexDirection="column">
              <Box>
                <Text color={workspaceChoice === "existing" ? "green" : "gray"}>
                  {workspaceChoice === "existing" ? "●" : "○"} 1. Use existing
                  git workspace
                </Text>
              </Box>
              <Box marginTop={1}>
                <Text color={workspaceChoice === "create" ? "green" : "gray"}>
                  {workspaceChoice === "create" ? "●" : "○"} 2. Create new
                  workspace
                </Text>
              </Box>
              <Box marginTop={1}>
                <Text color={workspaceChoice === "none" ? "green" : "gray"}>
                  {workspaceChoice === "none" ? "●" : "○"} 3. No workspace (just
                  session tracking)
                </Text>
              </Box>
            </Box>
            <Box marginTop={2}>
              <Text color="gray">
                Use ↑↓ to select, Enter to confirm, Esc to cancel
              </Text>
            </Box>
          </Box>
        );

      case "workspace-path": {
        const placeholder =
          workspaceChoice === "existing"
            ? "Enter path to existing git workspace"
            : "Enter path for new workspace";

        return (
          <Box flexDirection="column">
            <Text bold color="cyan">
              📂{" "}
              {workspaceChoice === "existing"
                ? "Select Existing"
                : "Create New"}{" "}
              Workspace
            </Text>
            <Box marginTop={1}>
              <Text>{placeholder}:</Text>
            </Box>
            <Box marginTop={1}>
              <Text color="yellow">{workspacePath}</Text>
              <Text color="gray">_</Text>
            </Box>
            <Box marginTop={1}>
              <Text color="gray">Press Enter to continue, Esc to cancel</Text>
            </Box>
          </Box>
        );
      }

      case "confirm":
        return (
          <Box flexDirection="column">
            <Text bold color="cyan">
              ✅ Confirm Session Creation
            </Text>
            <Box marginTop={1}>
              <Text>
                Session Name: <Text color="green">{sessionName}</Text>
              </Text>
            </Box>
            <Box marginTop={1}>
              <Text>Workspace: </Text>
              {workspaceChoice === "none" ? (
                <Text color="gray">No workspace assigned</Text>
              ) : (
                <Text color="yellow">{workspacePath}</Text>
              )}
            </Box>
            <Box marginTop={2}>
              <Text color="gray">
                Press Enter to create session, Esc to cancel
              </Text>
            </Box>
            {error && (
              <Box marginTop={1}>
                <Text color="red">❌ {error}</Text>
              </Box>
            )}
          </Box>
        );
    }
  };

  if (isCreating) {
    return (
      <Box flexDirection="column" padding={2}>
        <Text bold color="cyan">
          🔄 Creating Session...
        </Text>
        <Box marginTop={1}>
          <Text>Please wait while we set up your session.</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={2}>
      {renderStep()}
    </Box>
  );
};
