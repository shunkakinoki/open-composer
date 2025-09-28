import { Box, Text, useApp, useInput } from "ink";
import type React from "react";
import { useState } from "react";

export interface GitWorktreeCreateOptions {
  path: string;
  ref?: string;
  branch?: string;
  force: boolean;
  detach: boolean;
  noCheckout: boolean;
  branchForce: boolean;
}

interface GitWorktreeCreatePromptProps {
  onSubmit: (options: GitWorktreeCreateOptions) => void;
  onCancel?: () => void;
}

export const GitWorktreeCreatePrompt: React.FC<
  GitWorktreeCreatePromptProps
> = ({ onSubmit, onCancel }) => {
  const [currentField, setCurrentField] = useState<
    "path" | "ref" | "branch" | "options"
  >("path");
  const [options, setOptions] = useState<GitWorktreeCreateOptions>({
    path: "",
    ref: "",
    branch: "",
    force: false,
    detach: false,
    noCheckout: false,
    branchForce: false,
  });
  const { exit } = useApp();

  const updateOption = <K extends keyof GitWorktreeCreateOptions>(
    key: K,
    value: GitWorktreeCreateOptions[K],
  ) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  const nextField = () => {
    if (currentField === "path") setCurrentField("ref");
    else if (currentField === "ref") setCurrentField("branch");
    else if (currentField === "branch") setCurrentField("options");
  };

  const prevField = () => {
    if (currentField === "ref") setCurrentField("path");
    else if (currentField === "branch") setCurrentField("ref");
    else if (currentField === "options") setCurrentField("branch");
  };

  const handleSubmit = () => {
    if (!options.path.trim()) return; // Require at least a path

    onSubmit(options);
    exit();
  };

  const toggleOption = (
    option: keyof Pick<
      GitWorktreeCreateOptions,
      "force" | "detach" | "noCheckout" | "branchForce"
    >,
  ) => {
    updateOption(option, !options[option]);
  };

  useInput(
    (input, key) => {
      if (key.shift && key.tab) {
        prevField();
      } else if (key.tab) {
        nextField();
      } else if (key.return) {
        if (currentField === "options") {
          handleSubmit();
        } else {
          nextField();
        }
      } else if (key.escape || (key.ctrl && input === "c")) {
        onCancel?.();
        exit();
      } else if (key.backspace || key.delete) {
        // Handle backspace for current field
        if (currentField === "path") {
          updateOption("path", options.path.slice(0, -1));
        } else if (currentField === "ref") {
          updateOption("ref", options.ref?.slice(0, -1) || "");
        } else if (currentField === "branch") {
          updateOption("branch", options.branch?.slice(0, -1) || "");
        }
      } else if (input && currentField !== "options") {
        // Handle text input for current field
        if (currentField === "path") {
          updateOption("path", options.path + input);
        } else if (currentField === "ref") {
          updateOption("ref", (options.ref || "") + input);
        } else if (currentField === "branch") {
          updateOption("branch", (options.branch || "") + input);
        }
      } else if (key.upArrow || key.downArrow) {
        // Handle option toggling when in options field
        if (currentField === "options") {
          const optionOrder: (keyof GitWorktreeCreateOptions)[] = [
            "force",
            "detach",
            "noCheckout",
            "branchForce",
          ];
          const currentIndex = optionOrder.indexOf("force"); // Start with force
          const _nextIndex = key.upArrow
            ? (currentIndex - 1 + optionOrder.length) % optionOrder.length
            : (currentIndex + 1) % optionOrder.length;
          toggleOption(
            optionOrder[currentIndex] as keyof Pick<
              GitWorktreeCreateOptions,
              "force" | "detach" | "noCheckout" | "branchForce"
            >,
          );
        }
      }
    },
    { isActive: true },
  );

  const renderField = (
    fieldName: string,
    value: string,
    placeholder: string,
    required = false,
  ) => (
    <Box>
      <Text color="cyan">{fieldName}:</Text>
      <Text
        color={
          currentField === fieldName.toLowerCase() as typeof currentField
            ? "green"
            : "gray"
        }
      >
        {value || placeholder}
        {required && !value ? " *" : ""}
      </Text>
      {currentField === fieldName.toLowerCase() && (
        <Text color="gray" dimColor>
          _
        </Text>
      )}
    </Box>
  );

  const renderOption = (name: string, value: boolean, keyBinding?: string) => (
    <Box>
      <Text color={value ? "green" : "red"}>
        [{value ? "●" : "○"}] {name}
      </Text>
      {keyBinding && (
        <Text color="gray" dimColor>
          {" "}
          ({keyBinding})
        </Text>
      )}
    </Box>
  );

  return (
    <Box flexDirection="column" padding={2}>
      <Text bold color="cyan">
        🚀 Create Git Worktree
      </Text>

      <Box marginTop={1} marginBottom={1}>
        <Text>Create a new git worktree with interactive configuration.</Text>
      </Box>

      <Box marginTop={2} marginBottom={1}>
        <Text bold>Configuration:</Text>
      </Box>

      {renderField("Path", options.path, "Enter worktree path", true)}
      {renderField("Ref", options.ref || "", "Optional commit/branch ref")}
      {renderField("Branch", options.branch || "", "Optional branch name")}

      <Box marginTop={2} marginBottom={1}>
        <Text bold>Options:</Text>
      </Box>

      <Box flexDirection="column">
        {renderOption("Force", options.force, "F")}
        {renderOption("Detach", options.detach, "D")}
        {renderOption("No Checkout", options.noCheckout, "N")}
        {renderOption("Branch Force", options.branchForce, "B")}
      </Box>

      <Box marginTop={2}>
        <Text color="gray">
          Tab/Shift+Tab: Navigate • Enter: Next/Submit • ↑/↓: Toggle options •
          Esc: Cancel
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text color="yellow">
          {!options.path.trim()
            ? "⚠️  Path is required"
            : "✅ Ready to create worktree"}
        </Text>
      </Box>
    </Box>
  );
};
