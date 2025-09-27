// biome-ignore assist/source/organizeImports: False positive
import type React from "react";
import { Box, Text } from "ink";

interface Worktree {
  name: string;
  path: string;
  branch: string;
  active: boolean;
}

interface SidebarProps {
  worktrees: Worktree[];
  currentBranch: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  worktrees,
  currentBranch,
}) => {
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="blue">
        📂 Workspaces
      </Text>

      <Box flexDirection="column" marginTop={1}>
        {worktrees.map((worktree) => (
          <Box key={worktree.name} marginY={0}>
            <Text color={worktree.active ? "green" : "gray"}>
              {worktree.active ? "●" : "○"} {worktree.name}
            </Text>
          </Box>
        ))}
      </Box>

      <Box marginTop={2}>
        <Text bold color="yellow">
          🌿 Branches
        </Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text color="green">● {currentBranch}</Text>
        <Text color="gray" dimColor>
          + New worktree
        </Text>
      </Box>

      <Box marginTop={2}>
        <Text bold color="magenta">
          🤖 Agents
        </Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text color="green">● claude-code</Text>
        <Text color="gray">○ codex-nation</Text>
        <Text color="gray">○ cursor-agent</Text>
      </Box>
    </Box>
  );
};
