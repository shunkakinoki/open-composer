import type { AISession } from "@open-composer/agent-sessions";
import { AISessionsService } from "@open-composer/agent-sessions";
import * as Effect from "effect/Effect";
import { Box, Text, useApp, useInput, useStdout } from "ink";
import type React from "react";
import { useEffect, useState } from "react";

/**
 * Interactive TUI component for viewing all AI agent sessions
 */

interface AISessionsListProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

const formatTimestamp = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
};

const getAgentColor = (agent: AISession["agent"]): string => {
  switch (agent) {
    case "codex":
      return "blue";
    case "cursor":
    case "cursor-agent":
      return "magenta";
    case "claude-code":
      return "cyan";
    default:
      return "gray";
  }
};

const getStatusIcon = (status: AISession["status"]): string => {
  switch (status) {
    case "active":
      return "●";
    case "completed":
      return "✓";
    case "failed":
      return "✗";
    default:
      return "○";
  }
};

const getStatusColor = (status: AISession["status"]): string => {
  switch (status) {
    case "active":
      return "green";
    case "completed":
      return "blue";
    case "failed":
      return "red";
    default:
      return "gray";
  }
};

export const AISessionsList: React.FC<AISessionsListProps> = ({
  onComplete,
  onCancel,
}) => {
  const [sessions, setSessions] = useState<AISession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filterAgent, setFilterAgent] = useState<AISession["agent"] | "all">(
    "all",
  );
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Get terminal dimensions for fullscreen (only when running in a real terminal)
  const terminalHeight = stdout?.rows;
  const terminalWidth = stdout?.columns;

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const service = new AISessionsService();
        const allSessions = await service
          .getAllSessions()
          .pipe(Effect.runPromise);
        setSessions(allSessions);
        setIsLoading(false);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load sessions",
        );
        setIsLoading(false);
      }
    };

    loadSessions();
  }, []);

  useInput(
    (input, key) => {
      if (key.escape || (key.ctrl && input === "c")) {
        onCancel?.();
        exit();
        return;
      }

      if (key.upArrow || input === "k") {
        setSelectedIndex(Math.max(0, selectedIndex - 1));
      } else if (key.downArrow || input === "j") {
        setSelectedIndex(
          Math.min(filteredSessions.length - 1, selectedIndex + 1),
        );
      } else if (input === "1") {
        setFilterAgent("all");
        setSelectedIndex(0);
      } else if (input === "2") {
        setFilterAgent("codex");
        setSelectedIndex(0);
      } else if (input === "3") {
        setFilterAgent("cursor-agent");
        setSelectedIndex(0);
      } else if (input === "4") {
        setFilterAgent("claude-code");
        setSelectedIndex(0);
      } else if (key.return) {
        onComplete?.();
        exit();
      }
    },
    { isActive: true },
  );

  const filteredSessions =
    filterAgent === "all"
      ? sessions
      : sessions.filter((s) => s.agent === filterAgent);

  if (isLoading) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">
          🔄 Loading AI Sessions...
        </Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="red">
          ❌ Error Loading Sessions
        </Text>
        <Box marginTop={1}>
          <Text color="red">{error}</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      padding={1}
      {...(terminalHeight && { height: terminalHeight })}
      {...(terminalWidth && { width: terminalWidth })}
    >
      <Text bold color="cyan">
        🤖 AI Agent Sessions
      </Text>

      <Box marginTop={1}>
        <Text color="gray">
          Filter: {filterAgent === "all" ? "All" : filterAgent} | Total:{" "}
          {filteredSessions.length}
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="row" gap={2}>
        <Text color={filterAgent === "all" ? "green" : "gray"}>1. All</Text>
        <Text color={filterAgent === "codex" ? "green" : "gray"}>2. Codex</Text>
        <Text color={filterAgent === "cursor-agent" ? "green" : "gray"}>
          3. Cursor
        </Text>
        <Text color={filterAgent === "claude-code" ? "green" : "gray"}>
          4. Claude Code
        </Text>
      </Box>

      <Box
        marginTop={1}
        borderStyle="single"
        borderColor="gray"
        flexDirection="column"
      >
        <Box paddingX={1}>
          <Box width={30}>
            <Text bold>Agent</Text>
          </Box>
          <Box width={20}>
            <Text bold>Status</Text>
          </Box>
          <Box width={15}>
            <Text bold>Time</Text>
          </Box>
          <Box width={40}>
            <Text bold>Repository</Text>
          </Box>
        </Box>

        {filteredSessions.length === 0 ? (
          <Box paddingX={1} paddingY={1}>
            <Text color="gray">No sessions found</Text>
          </Box>
        ) : (
          filteredSessions.slice(0, 20).map((session, index) => {
            const isSelected = index === selectedIndex;
            const bgColor = isSelected ? "blue" : undefined;

            return (
              <Box key={session.id} paddingX={1} backgroundColor={bgColor}>
                <Box width={30}>
                  <Text color={getAgentColor(session.agent)}>
                    {session.agent.padEnd(15)}
                  </Text>
                </Box>
                <Box width={20}>
                  <Text color={getStatusColor(session.status)}>
                    {getStatusIcon(session.status)} {session.status}
                  </Text>
                </Box>
                <Box width={15}>
                  <Text color="gray">{formatTimestamp(session.timestamp)}</Text>
                </Box>
                <Box width={40}>
                  <Text>
                    {session.repository?.slice(-40) ||
                      session.cwd?.slice(-40) ||
                      "-"}
                  </Text>
                </Box>
              </Box>
            );
          })
        )}
      </Box>

      <Box marginTop={1}>
        <Text color="gray">
          ↑↓/jk: navigate | 1-4: filter | Enter: exit | Esc: cancel
        </Text>
      </Box>
    </Box>
  );
};
