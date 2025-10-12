import { TextAttributes } from "@opentui/core";

import type { Worktree } from "@open-composer/git-worktrees";
import { useKeyboard } from "@opentui/react"; 
import type React from "react";
import { useState } from "react";

interface GitWorktreeSwitchPromptProps {
  worktrees: readonly Worktree[];
  onSubmit: (worktreePath: string) => void;
  onCancel?: () => void;
}

export const GitWorktreeSwitchPrompt: React.FC<
  GitWorktreeSwitchPromptProps
> = ({ worktrees, onSubmit, onCancel }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  

  const handleSubmit = () => {
    if (worktrees.length === 0) return;

    const selectedWorktree = worktrees[selectedIndex];
    onSubmit(selectedWorktree.path);
    process.exit(0);
  };

  const handleCancel = () => {
    onCancel?.();
    process.exit(0);
  };

  useKeyboard(
    (key) => {
      if (key.name === "up") {
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : worktrees.length - 1,
        );
      } else if (key.name === "down") {
        setSelectedIndex((prev) =>
          prev < worktrees.length - 1 ? prev + 1 : 0,
        );
      } else if (key.name === "return") {
        handleSubmit();
      } else if (key.name === "escape" || (key.ctrl && key.sequence === "c")) {
        handleCancel();
      }
    },
    { isActive: true },
  );

  if (worktrees.length === 0) {
    return (
      <box flexDirection="column" padding={2}>
        <text content="⚠️ No Git Worktrees Found" style={{ fg: "yellow", attributes: TextAttributes.BOLD }} />
        <box marginTop={1}>
          <text content="No worktrees available to switch to." />
        </box>
        <box marginTop={1}>
          <text content="Press Esc to cancel" style={{ fg: "gray" }} />
        </box>
      </box>
    );
  }

  return (
    <box flexDirection="column" padding={2}>
      <text content="🔄 Switch Git Worktree" style={{ fg: "cyan", attributes: TextAttributes.BOLD }} />

      <box marginTop={1} marginBottom={1}>
        <text content="Select a worktree to switch to:" />
      </box>

      <box flexDirection="column">
        {worktrees.map((worktree, index) => {
          const isSelected = index === selectedIndex;
          const isCurrent = worktree.path === process.cwd();

          const prefix = `${isSelected ? "▶ " : "  "}${isCurrent ? "📍 " : "   "}`;
          const branchText = worktree.branch || "(detached)";
          const lockedText = worktree.locked ? ` [locked: ${worktree.locked.reason || "unknown"}]` : "";
          const prunableText = worktree.prunable ? ` [prunable: ${worktree.prunable.reason || "unknown"}]` : "";
          const fullText = `${prefix}${branchText} at ${worktree.path}${lockedText}${prunableText}`;

          return (
            <box key={worktree.path}>
              <text
                content={fullText}
                style={{ fg: isSelected ? "green" : "gray" }}
              />
            </box>
          );
        })}
      </box>

      <box marginTop={2}>
        <text content="↑/↓: Navigate • Enter: Switch • Esc: Cancel" style={{ fg: "gray" }} />
      </box>

      <box marginTop={1}>
        <text content="📍 = current worktree" style={{ fg: "yellow" }} />
      </box>
    </box>
  );
};
