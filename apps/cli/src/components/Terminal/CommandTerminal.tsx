/**
 * CommandTerminal - Terminal component with automatic command execution
 *
 * This component extends the Terminal component to automatically execute
 * shell commands and display their output in real-time.
 */

import { Box, Text } from "ink";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { Terminal, type TerminalProps } from "./index.js";

export interface CommandTerminalProps extends Omit<TerminalProps, "children"> {
  command: string;
  args?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  onComplete?: (exitCode: number | null) => void;
  onError?: (error: Error) => void;
  showCommand?: boolean;
}

export const CommandTerminal: React.FC<CommandTerminalProps> = ({
  command,
  args = [],
  cwd,
  env,
  onComplete,
  onError,
  showCommand = true,
  ...terminalProps
}) => {
  const [lines, setLines] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(true);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const processRef = useRef<ChildProcess | null>(null);

  useEffect(() => {
    // Spawn the command
    const child = spawn(command, args, {
      cwd,
      env: env || process.env,
      shell: true,
    });

    processRef.current = child;

    // Add command line if showCommand is true
    if (showCommand) {
      const commandLine = `$ ${command}${args.length > 0 ? ` ${args.join(" ")}` : ""}`;
      setLines((prev) => [...prev, commandLine]);
    }

    // Handle stdout
    child.stdout?.on("data", (data: Buffer) => {
      const output = data.toString();
      const newLines = output.split("\n").filter((line) => line.length > 0);
      setLines((prev) => [...prev, ...newLines]);
    });

    // Handle stderr
    child.stderr?.on("data", (data: Buffer) => {
      const output = data.toString();
      const newLines = output.split("\n").filter((line) => line.length > 0);
      // Prefix stderr lines with red color indicator
      const errorLines = newLines.map((line) => `\x1b[31m${line}\x1b[0m`);
      setLines((prev) => [...prev, ...errorLines]);
    });

    // Handle process error
    child.on("error", (error) => {
      setLines((prev) => [...prev, `\x1b[31mError: ${error.message}\x1b[0m`]);
      setIsRunning(false);
      if (onError) {
        onError(error);
      }
    });

    // Handle process exit
    child.on("close", (code) => {
      setExitCode(code);
      setIsRunning(false);
      if (onComplete) {
        onComplete(code);
      }
    });

    // Cleanup on unmount
    return () => {
      if (processRef.current && !processRef.current.killed) {
        processRef.current.kill();
      }
    };
  }, [command, args, cwd, env, onComplete, onError, showCommand]);

  return (
    <Terminal {...terminalProps}>
      <Box flexDirection="column">
        {lines.map((line, index) => (
          <Text key={index}>{line}</Text>
        ))}
        {!isRunning && exitCode !== null && (
          <Text color={exitCode === 0 ? "green" : "red"}>
            {exitCode === 0 ? "✓" : "✗"} Process exited with code {exitCode}
          </Text>
        )}
        {isRunning && (
          <Text color="gray" dimColor>
            Running...
          </Text>
        )}
      </Box>
    </Terminal>
  );
};
