import { Box, Text } from "ink";
import type React from "react";

interface StatusBarProps {
  branch?: string;
  worktree?: string;
  agent?: string;
  status?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  branch = "main",
  worktree,
  agent = "claude-code",
  status = "Ready",
}) => {
  return (
    <Box
      borderStyle="single"
      borderColor="gray"
      justifyContent="space-between"
      flexDirection="row"
      paddingX={1}
    >
      <Box>
        <Text color="green">{status}</Text>
        {branch && (
          <>
            <Text color="gray"> | Branch: </Text>
            <Text color="yellow">{branch}</Text>
          </>
        )}
        {worktree && (
          <>
            <Text color="gray"> | Worktree: </Text>
            <Text color="cyan">{worktree}</Text>
          </>
        )}
        {agent && (
          <>
            <Text color="gray"> | Agent: </Text>
            <Text color="magenta">{agent}</Text>
          </>
        )}
      </Box>

      <Box>
        <Text color="gray">Press </Text>
        <Text color="cyan" bold>
          q
        </Text>
        <Text color="gray"> to quit | </Text>
        <Text color="cyan" bold>
          ?
        </Text>
        <Text color="gray"> for help</Text>
      </Box>
    </Box>
  );
};
