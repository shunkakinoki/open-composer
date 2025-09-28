import type { Worktree } from "@open-composer/git-worktrees";
import { Box, Text, useApp, useInput } from "ink";
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
  const { exit } = useApp();

  const handleSubmit = () => {
    if (worktrees.length === 0) return;

    const selectedWorktree = worktrees[selectedIndex];
    onSubmit(selectedWorktree.path);
    exit();
  };

  const handleCancel = () => {
    onCancel?.();
    exit();
  };

  useInput(
    (input, key) => {
      if (key.upArrow) {
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : worktrees.length - 1,
        );
      } else if (key.downArrow) {
        setSelectedIndex((prev) =>
          prev < worktrees.length - 1 ? prev + 1 : 0,
        );
      } else if (key.return) {
        handleSubmit();
      } else if (key.escape || (key.ctrl && input === "c")) {
        handleCancel();
      }
    },
    { isActive: true },
  );

  if (worktrees.length === 0) {
    return (
      <Box flexDirection="column" padding={2}>
        <Text bold color="yellow">
          ⚠️ No Git Worktrees Found
        </Text>
        <Box marginTop={1}>
          <Text>No worktrees available to switch to.</Text>
        </Box>
        <Box marginTop={1}>
          <Text color="gray">Press Esc to cancel</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={2}>
      <Text bold color="cyan">
        🔄 Switch Git Worktree
      </Text>

      <Box marginTop={1} marginBottom={1}>
        <Text>Select a worktree to switch to:</Text>
      </Box>

      <Box flexDirection="column">
        {worktrees.map((worktree, index) => {
          const isSelected = index === selectedIndex;
          const isCurrent = worktree.path === process.cwd();

          return (
            <Box key={worktree.path}>
              <Text color={isSelected ? "green" : "gray"}>
                {isSelected ? "▶ " : "  "}
                {isCurrent ? "📍 " : "   "}
                <Text color={isSelected ? "green" : "white"}>
                  {worktree.branch || "(detached)"}
                </Text>
                <Text color="gray"> at </Text>
                <Text color={isSelected ? "cyan" : "gray"}>
                  {worktree.path}
                </Text>
                {worktree.locked && (
                  <Text color="yellow">
                    {" "}
                    [locked: {worktree.locked.reason || "unknown"}]
                  </Text>
                )}
                {worktree.prunable && (
                  <Text color="red">
                    {" "}
                    [prunable: {worktree.prunable.reason || "unknown"}]
                  </Text>
                )}
              </Text>
            </Box>
          );
        })}
      </Box>

      <Box marginTop={2}>
        <Text color="gray">↑/↓: Navigate • Enter: Switch • Esc: Cancel</Text>
      </Box>

      <Box marginTop={1}>
        <Text color="yellow">📍 = current worktree</Text>
      </Box>
    </Box>
  );
};
