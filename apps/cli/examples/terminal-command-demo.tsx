#!/usr/bin/env tsx
/**
 * Terminal Command Demo
 *
 * This example demonstrates how to run actual terminal commands
 * and display their output in real-time using the CommandTerminal component.
 *
 * Usage:
 *   bun run examples/terminal-command-demo.tsx
 */

import { Box, Text, render } from "ink";
import { CommandTerminal } from "../src/components/Terminal/CommandTerminal.js";
import React, { useState } from "react";

const TerminalCommandDemo = () => {
  const [currentCommand, setCurrentCommand] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);

  const commands = [
    { command: "echo", args: ["Hello from the terminal!"], label: "Echo test" },
    { command: "pwd", args: [], label: "Current directory" },
    { command: "node", args: ["--version"], label: "Node version" },
    { command: "ls", args: ["-la"], label: "List files" },
    { command: "sh", args: ["-c", "echo 'Line 1' && echo 'Line 2' && echo 'Line 3'"], label: "Multiple lines" },
  ];

  const handleComplete = (code: number) => {
    setCompleted([...completed, currentCommand]);

    if (currentCommand < commands.length - 1) {
      setTimeout(() => {
        setCurrentCommand(currentCommand + 1);
      }, 1000);
    } else {
      setTimeout(() => {
        process.exit(0);
      }, 2000);
    }
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Terminal Command Demo ({currentCommand + 1}/{commands.length})
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text dimColor>
          Running: {commands[currentCommand].label}
        </Text>
      </Box>

      <CommandTerminal
        command={commands[currentCommand].command}
        args={commands[currentCommand].args}
        onComplete={handleComplete}
      />

      {completed.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text color="green">
            Completed: {completed.length}/{commands.length}
          </Text>
        </Box>
      )}
    </Box>
  );
};

render(<TerminalCommandDemo />);
