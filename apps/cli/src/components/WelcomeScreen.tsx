import { Box, Text, useApp, useInput, useStdout } from "ink";
import TextInput from "ink-text-input";
import type React from "react";
import { useState } from "react";
import { CLI_VERSION } from "../lib/version.js";
import { AsciiLogo } from "./AsciiLogo.js";

interface WelcomeScreenProps {
  onCommandSelect?: (commandName: string) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onCommandSelect,
}) => {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [commandInput, setCommandInput] = useState("");

  // Get terminal dimensions for fullscreen (only when running in a real terminal)
  const terminalHeight = stdout?.rows;
  const terminalWidth = stdout?.columns;

  // Define command shortcuts
  const commands = [
    { cmd: "/sessions", desc: "list sessions", key: "ctrl+x l" },
    { cmd: "/run", desc: "run a command", key: "ctrl+x r" },
    { cmd: "/spawn", desc: "spawn a new agent", key: "ctrl+x s" },
    { cmd: "/status", desc: "show status", key: "ctrl+x t" },
    { cmd: "/stack", desc: "manage git stack", key: "ctrl+x k" },
    { cmd: "/settings", desc: "configure settings", key: "ctrl+x c" },
  ];

  const handleSubmit = (value: string) => {
    if (value.trim()) {
      // Remove leading slash if present for command name
      const commandName = value.startsWith("/") ? value.slice(1) : value;
      onCommandSelect?.(commandName);
      setCommandInput("");
    }
  };

  useInput((input, key) => {
    if (key.escape || input === "q") {
      exit();
    }
  });

  return (
    <Box
      flexDirection="column"
      {...(terminalHeight && { height: terminalHeight })}
      {...(terminalWidth && { width: terminalWidth })}
    >
      {/* Main content - centered vertically */}
      <Box flexDirection="column" flexGrow={1} justifyContent="center">
        {/* ASCII Art Logo - centered */}
        <Box marginBottom={2}>
          <AsciiLogo version={CLI_VERSION} />
        </Box>

        {/* Command shortcuts - centered */}
        <Box flexDirection="column" alignItems="center" marginTop={3}>
          {commands.map((command) => (
            <Box key={command.cmd} width={60} justifyContent="space-between">
              <Box width={15}>
                <Text color="cyan">{command.cmd}</Text>
              </Box>
              <Box width={25}>
                <Text color="gray">{command.desc}</Text>
              </Box>
              <Box width={15}>
                <Text color="gray" dimColor>
                  {command.key}
                </Text>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Bottom input bar */}
      <Box
        flexDirection="row"
        paddingX={2}
        paddingY={1}
        borderStyle="single"
        borderColor="gray"
      >
        <Box marginRight={1}>
          <Text color="cyan" bold>
            {"> "}
          </Text>
        </Box>
        <Box flexGrow={1}>
          <TextInput
            value={commandInput}
            onChange={setCommandInput}
            onSubmit={handleSubmit}
            placeholder="Type a command and press enter..."
          />
        </Box>
        <Box marginLeft={2}>
          <Text color="gray" dimColor>
            Press ESC or q to quit
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
