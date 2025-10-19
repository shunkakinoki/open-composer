#!/usr/bin/env bun

import React, { useState } from 'react';
import { render, Box, Text } from 'ink';
import { Terminal } from '../src/index.js';

/**
 * Example 1: Non-interactive terminal running a command
 */
const SimpleExample: React.FC = () => {
  const [exitCode, setExitCode] = useState<number | null>(null);

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">
        Simple Terminal Example - Running 'ls -la'
      </Text>
      <Text dimColor>─────────────────────────────────────</Text>
      <Terminal
        command="ls"
        args={['-la']}
        cols={80}
        rows={20}
        onExit={(code) => {
          setExitCode(code);
        }}
      />
      {exitCode !== null && (
        <Text color={exitCode === 0 ? 'green' : 'red'}>
          Process exited with code: {exitCode}
        </Text>
      )}
    </Box>
  );
};

/**
 * Example 2: Interactive terminal (like a shell)
 */
const InteractiveExample: React.FC = () => {
  const [exitCode, setExitCode] = useState<number | null>(null);

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">
        Interactive Terminal Example - Bash Shell
      </Text>
      <Text dimColor>
        (Focus on the terminal below to type commands, press Ctrl+D to exit)
      </Text>
      <Text dimColor>─────────────────────────────────────</Text>
      <Terminal
        command="bash"
        args={['-i']}
        cols={80}
        rows={20}
        interactive={true}
        onExit={(code) => {
          setExitCode(code);
        }}
      />
      {exitCode !== null && (
        <Text color={exitCode === 0 ? 'green' : 'red'}>
          Shell exited with code: {exitCode}
        </Text>
      )}
    </Box>
  );
};

/**
 * Example 3: Running a colored command (demonstrates ANSI color parsing)
 */
const ColoredExample: React.FC = () => {
  const [exitCode, setExitCode] = useState<number | null>(null);

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">
        Colored Terminal Example - Running 'npm test' style command
      </Text>
      <Text dimColor>─────────────────────────────────────</Text>
      <Terminal
        command="bash"
        args={[
          '-c',
          'echo -e "\\033[1;32m✓ Test passed\\033[0m\n\\033[1;31m✗ Test failed\\033[0m\n\\033[1;33m⚠ Warning\\033[0m"',
        ]}
        cols={80}
        rows={10}
        onExit={(code) => {
          setExitCode(code);
        }}
      />
      {exitCode !== null && (
        <Text color={exitCode === 0 ? 'green' : 'red'}>
          Process exited with code: {exitCode}
        </Text>
      )}
    </Box>
  );
};

/**
 * Example 4: Long running process with streaming output
 */
const StreamingExample: React.FC = () => {
  const [exitCode, setExitCode] = useState<number | null>(null);

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">
        Streaming Terminal Example - Counting with delay
      </Text>
      <Text dimColor>─────────────────────────────────────</Text>
      <Terminal
        command="sh"
        args={[
          '-c',
          'i=1; while [ $i -le 10 ]; do echo "Count: $i"; sleep 0.5; i=$((i+1)); done',
        ]}
        cols={80}
        rows={15}
        onExit={(code) => {
          setExitCode(code);
        }}
      />
      {exitCode !== null && (
        <Text color={exitCode === 0 ? 'green' : 'red'}>
          Process exited with code: {exitCode}
        </Text>
      )}
    </Box>
  );
};

/**
 * Main app with example selection
 */
const App: React.FC = () => {
  const example = process.argv[2] || 'simple';

  switch (example) {
    case 'interactive':
      return <InteractiveExample />;
    case 'colored':
      return <ColoredExample />;
    case 'streaming':
      return <StreamingExample />;
    case 'simple':
    default:
      return <SimpleExample />;
  }
};

// Render the app
render(<App />);
