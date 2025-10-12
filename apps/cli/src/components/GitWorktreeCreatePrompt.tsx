import { TextAttributes } from "@opentui/core";

import { useKeyboard } from "@opentui/react"; 
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
  defaultPath?: string;
}

export const GitWorktreeCreatePrompt: React.FC<
  GitWorktreeCreatePromptProps
> = ({ onSubmit, onCancel, defaultPath = "" }) => {
  const [currentField, setCurrentField] = useState<
    "path" | "ref" | "branch" | "options"
  >("path");
  const [options, setOptions] = useState<GitWorktreeCreateOptions>({
    path: defaultPath,
    ref: "",
    branch: "",
    force: false,
    detach: false,
    noCheckout: false,
    branchForce: false,
  });
  

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
    process.exit(0);
  };

  const toggleOption = (
    option: keyof Pick<
      GitWorktreeCreateOptions,
      "force" | "detach" | "noCheckout" | "branchForce"
    >,
  ) => {
    updateOption(option, !options[option]);
  };

  useKeyboard(
    (key) => {
      if (key.shift && key.name === "tab") {
        prevField();
      } else if (key.name === "tab") {
        nextField();
      } else if (key.name === "return") {
        if (currentField === "options") {
          handleSubmit();
        } else {
          nextField();
        }
      } else if (key.name === "escape" || (key.ctrl && key.sequence === "c")) {
        onCancel?.();
        process.exit(0);
      } else if (key.name === "backspace" || key.name === "delete") {
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
      } else if (key.name === "up" || key.name === "down") {
        // Handle option toggling when in options field
        if (currentField === "options") {
          const optionOrder: (keyof GitWorktreeCreateOptions)[] = [
            "force",
            "detach",
            "noCheckout",
            "branchForce",
          ];
          const currentIndex = optionOrder.indexOf("force"); // Start with force
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
    <box>
      <text content={`${fieldName}:`} style={{ fg: "cyan" }} />
      <text
        content={`${value || placeholder}${required && !value ? " *" : ""}`}
        style={{
          fg: currentField === (fieldName.toLowerCase() as "path" | "ref" | "branch" | "options") ? "green" : "gray"
        }}
      />
      {currentField === (fieldName.toLowerCase() as typeof currentField) && (
        <text content="_" style={{ fg: "gray" }} />
      )}
    </box>
  );

  const renderOption = (name: string, value: boolean, keyBinding?: string) => (
    <box>
      <text
        content={`[${value ? "●" : "○"}] ${name}${keyBinding ? ` (${keyBinding})` : ""}`}
        style={{ fg: value ? "green" : "red" }}
      />
    </box>
  );

  return (
    <box flexDirection="column" padding={2}>
      <text content="🚀 Create Git Worktree" style={{ fg: "cyan", attributes: TextAttributes.BOLD }} />

      <box marginTop={1} marginBottom={1}>
        <text content="Create a new git worktree with interactive configuration." />
      </box>

      <box marginTop={2} marginBottom={1}>
        <text content="Configuration:" style={{ attributes: TextAttributes.BOLD }} />
      </box>

      {renderField("Path", options.path, "Enter worktree path", true)}
      {renderField("Ref", options.ref || "", "Optional commit/branch ref")}
      {renderField("Branch", options.branch || "", "Optional branch name")}

      <box marginTop={2} marginBottom={1}>
        <text content="Options:" style={{ attributes: TextAttributes.BOLD }} />
      </box>

      <box flexDirection="column">
        {renderOption("Force", options.force, "F")}
        {renderOption("Detach", options.detach, "D")}
        {renderOption("No Checkout", options.noCheckout, "N")}
        {renderOption("Branch Force", options.branchForce, "B")}
      </box>

      <box marginTop={2}>
        <text
          content="Tab/Shift+Tab: Navigate • Enter: Next/Submit • ↑/↓: Toggle options • Esc: Cancel"
          style={{ fg: "gray" }}
        />
      </box>

      <box marginTop={1}>
        <text
          content={!options.path.trim() ? "⚠️  Path is required" : "✅ Ready to create worktree"}
          style={{ fg: "yellow" }}
        />
      </box>
    </box>
  );
};
