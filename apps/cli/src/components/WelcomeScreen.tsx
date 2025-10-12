import { TextAttributes } from "@opentui/core";
import type React from "react";
import { useState } from "react";
import { CLI_VERSION } from "../lib/version.js";
import { MainMenu, type MenuItem } from "./MainMenu.js";
import { StatusBar } from "./StatusBar.js";

interface WelcomeScreenProps {
  onCommandSelect?: (commandName: string) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onCommandSelect,
}) => {
  
  
  const [selectedCommand, setSelectedCommand] = useState<string | null>(null);

  // Terminal dimensions are handled by the renderer in opentui
  // These are not needed as the renderer handles terminal size automatically

  // Define menu items based on available commands
  const menuItems: MenuItem[] = [
    {
      key: "sessions",
      label: "Sessions",
      description: "List all sessions",
      onSelect: () => {
        setSelectedCommand("sessions");
        onCommandSelect?.("sessions");
      },
    },
    {
      key: "run",
      label: "Run",
      description: "Run a command",
      onSelect: () => {
        setSelectedCommand("run");
        onCommandSelect?.("run");
      },
    },
    {
      key: "spawn",
      label: "Spawn",
      description: "Spawn a new agent",
      onSelect: () => {
        setSelectedCommand("spawn");
        onCommandSelect?.("spawn");
      },
    },
    {
      key: "status",
      label: "Status",
      description: "Show status",
      onSelect: () => {
        setSelectedCommand("status");
        onCommandSelect?.("status");
      },
    },
    {
      key: "stack",
      label: "Stack",
      description: "Manage git stack",
      onSelect: () => {
        setSelectedCommand("stack");
        onCommandSelect?.("stack");
      },
    },
    {
      key: "settings",
      label: "Settings",
      description: "Configure settings",
      onSelect: () => {
        setSelectedCommand("settings");
        onCommandSelect?.("settings");
      },
    },
    {
      key: "tui",
      label: "Full TUI",
      description: "Launch full TUI mode",
      onSelect: () => {
        setSelectedCommand("tui");
        onCommandSelect?.("tui");
      },
    },
  ];

  const handleExit = () => {
    process.exit(0);
  };

  return (
    <box
      flexDirection="column"
    >
      {/* Header */}
      <box
        borderStyle="double"
        borderColor="cyan"
        justifyContent="center"
        paddingY={1}
      >
        <text content={`🎼 Open Composer CLI v${CLI_VERSION}`} style={{ fg: "cyan", attributes: TextAttributes.BOLD }} />
      </box>

      {/* Welcome Message */}
      <box
        flexDirection="column"
        padding={2}
        borderStyle="single"
        borderColor="gray"
      >
        <text content="Welcome to Open Composer! 👋" style={{ fg: "white", attributes: TextAttributes.BOLD }} />
        <text content="An agent orchestration framework for building with AI" style={{ fg: "gray" }} />
      </box>

      {/* Main Content Area */}
      <box flexGrow={1} flexDirection="row">
        {/* Main Menu */}
        <box width="60%">
          <MainMenu items={menuItems} onExit={handleExit} />
        </box>

        {/* Quick Info Panel */}
        <box
          width="40%"
          flexDirection="column"
          padding={1}
          borderStyle="single"
          borderColor="gray"
        >
          <text content="ℹ️ Quick Info" style={{ fg: "yellow", attributes: TextAttributes.BOLD }} />
          <box marginTop={1} flexDirection="column">
            <text content="• Select a command to get started" style={{ fg: "gray" }} />
            <text content="• Use arrow keys or j/k to navigate" style={{ fg: "gray" }} />
            <text content="• Press number keys for quick access" style={{ fg: "gray" }} />
            <text content="• Press Enter to execute command" style={{ fg: "gray" }} />
            <text content="• Press q to quit" style={{ fg: "gray" }} />
          </box>

          {selectedCommand && (
            <box marginTop={2} flexDirection="column">
              <text content="Selected:" style={{ fg: "green", attributes: TextAttributes.BOLD }} />
              <text content={selectedCommand} style={{ fg: "cyan" }} />
            </box>
          )}

          <box marginTop={2} flexDirection="column">
            <text content="🚀 Get Started" style={{ fg: "magenta", attributes: TextAttributes.BOLD }} />
            <box marginTop={1} flexDirection="column">
              <text content="Run 'open-composer --help' for CLI usage" style={{ fg: "gray" }} />
              <text content="Visit docs for more information" style={{ fg: "gray" }} />
            </box>
          </box>
        </box>
      </box>

      {/* Status Bar */}
      <StatusBar status="Ready" />
    </box>
  );
};
