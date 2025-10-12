import { TextAttributes } from "@opentui/core";

import type { AgentSession } from "@open-composer/agent-sessions";
import { AgentSessionsService } from "@open-composer/agent-sessions";
import * as Effect from "effect/Effect";
import { useKeyboard } from "@opentui/react"; 
import type React from "react";
import { useEffect, useState } from "react";

/**
 * Interactive TUI component for viewing all AI agent sessions
 */

interface AgentSessionsListProps {
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

const getAgentColor = (agent: AgentSession["agent"]): string => {
  switch (agent) {
    case "codex":
      return "blue";
    case "cursor":
    case "cursor-agent":
      return "magenta";
    case "claude-code":
      return "cyan";
    case "opencode":
      return "green";
    default:
      return "gray";
  }
};

const getStatusIcon = (status: AgentSession["status"]): string => {
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

const getStatusColor = (status: AgentSession["status"]): string => {
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

export const AgentSessionsList: React.FC<AgentSessionsListProps> = ({
  onComplete,
  onCancel,
}) => {
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filterAgent, setFilterAgent] = useState<AgentSession["agent"] | "all">(
    "all",
  );
  
  

  // Get terminal dimensions for fullscreen (only when running in a real terminal)
  const terminalHeight = stdout?.rows;
  const terminalWidth = stdout?.columns;

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const service = new AgentSessionsService();
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

  useKeyboard(
    (key) => {
      if (key.name === "escape" || (key.ctrl && key.sequence === "c")) {
        onCancel?.();
        process.exit(0);
        return;
      }

      if (key.name === "up" || key.sequence === "k") {
        setSelectedIndex(Math.max(0, selectedIndex - 1));
      } else if (key.name === "down" || key.sequence === "j") {
        setSelectedIndex(
          Math.min(filteredSessions.length - 1, selectedIndex + 1),
        );
      } else if (key.sequence === "1") {
        setFilterAgent("all");
        setSelectedIndex(0);
      } else if (key.sequence === "2") {
        setFilterAgent("codex");
        setSelectedIndex(0);
      } else if (key.sequence === "3") {
        setFilterAgent("cursor-agent");
        setSelectedIndex(0);
      } else if (key.sequence === "4") {
        setFilterAgent("claude-code");
        setSelectedIndex(0);
      } else if (key.sequence === "5") {
        setFilterAgent("opencode");
        setSelectedIndex(0);
      } else if (key.name === "return") {
        onComplete?.();
        process.exit(0);
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
      <box flexDirection="column" padding={1}>
        <text content="🔄 Loading Agent Sessions..." style={{ fg: "cyan", attributes: TextAttributes.BOLD }} />
      </box>
    );
  }

  if (error) {
    return (
      <box flexDirection="column" padding={1}>
        <text content="❌ Error Loading Agent Sessions" style={{ fg: "red", attributes: TextAttributes.BOLD }} />
        <box marginTop={1}>
          <text content={error} style={{ fg: "red" }} />
        </box>
      </box>
    );
  }

  return (
    <box
      flexDirection="column"
      padding={1}
      {...(terminalHeight && { height: terminalHeight })}
      {...(terminalWidth && { width: terminalWidth })}
    >
      <text content="🤖 AI Agent Sessions" style={{ fg: "cyan", attributes: TextAttributes.BOLD }} />

      <box marginTop={1}>
        <text
          content={`Filter: ${filterAgent === "all" ? "All" : filterAgent} | Total: ${filteredSessions.length}`}
          style={{ fg: "gray" }}
        />
      </box>

      <box marginTop={1} flexDirection="row" gap={2}>
        <text content="1. All" style={{ fg: filterAgent === "all" ? "green" : "gray" }} />
        <text content="2. Codex" style={{ fg: filterAgent === "codex" ? "green" : "gray" }} />
        <text content="3. Cursor" style={{ fg: filterAgent === "cursor-agent" ? "green" : "gray" }} />
        <text content="4. Claude Code" style={{ fg: filterAgent === "claude-code" ? "green" : "gray" }} />
        <text content="5. OpenCode" style={{ fg: filterAgent === "opencode" ? "green" : "gray" }} />
      </box>

      <box
        marginTop={1}
        borderStyle="single"
        borderColor="gray"
        flexDirection="column"
      >
        <box paddingX={1}>
          <box width={30}>
            <text content="Agent" style={{ attributes: TextAttributes.BOLD }} />
          </box>
          <box width={20}>
            <text content="Status" style={{ attributes: TextAttributes.BOLD }} />
          </box>
          <box width={15}>
            <text content="Time" style={{ attributes: TextAttributes.BOLD }} />
          </box>
          <box width={40}>
            <text content="Repository" style={{ attributes: TextAttributes.BOLD }} />
          </box>
        </box>

        {filteredSessions.length === 0 ? (
          <box paddingX={1} paddingY={1}>
            <text content="No sessions found" style={{ fg: "gray" }} />
          </box>
        ) : (
          filteredSessions.slice(0, 20).map((session, index) => {
            const isSelected = index === selectedIndex;
            const bgColor = isSelected ? "blue" : undefined;

            return (
              <box key={session.id} paddingX={1} backgroundColor={bgColor}>
                <box width={30}>
                  <text
                    content={session.agent.padEnd(15)}
                    style={{ fg: getAgentColor(session.agent) }}
                  />
                </box>
                <box width={20}>
                  <text
                    content={`${getStatusIcon(session.status)} ${session.status}`}
                    style={{ fg: getStatusColor(session.status) }}
                  />
                </box>
                <box width={15}>
                  <text content={formatTimestamp(session.timestamp)} style={{ fg: "gray" }} />
                </box>
                <box width={40}>
                  <text
                    content={session.repository?.slice(-40) || session.cwd?.slice(-40) || "-"}
                  />
                </box>
              </box>
            );
          })
        )}
      </box>

      <box marginTop={1}>
        <text content="↑↓/jk: navigate | 1-5: filter | Enter: exit | Esc: cancel" style={{ fg: "gray" }} />
      </box>
    </box>
  );
};
