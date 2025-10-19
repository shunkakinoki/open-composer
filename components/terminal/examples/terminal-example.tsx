#!/usr/bin/env bun

import React from 'react';
import { render } from 'ink';
import { Terminal } from '../src/index.js';

/**
 * Usage:
 *
 * 1. Non-interactive example (works with bun run):
 *    bun run components/terminal/examples/terminal-example.tsx
 *
 * 2. Interactive terminal example:
 *    ./components/terminal/examples/interactive-terminal-example.tsx
 *
 * Note: Interactive terminals require raw mode support, which is only
 * available when running directly in a real terminal, not through script runners.
 */

/**
 * Example showing how to use the Terminal component
 * This demonstrates calling <Terminal /> with an echo command
 * that displays the pwd output format
 *
 * Run with: bun run components/terminal/examples/terminal-example.tsx
 */
export const TerminalExample: React.FC = () => {
  return (
    <Terminal
      command="echo"
      args={['❯ pwd /Users/shunkakinoki/ghq/github.com/shunkakinoki/bun-playground']}
      cwd="/Users/shunkakinoki/ghq/github.com/shunkakinoki/bun-playground"
      cols={80}
      rows={24}
      interactive={false}
      onExit={(code) => {
        console.log(`\nTerminal exited with code: ${code}`);
        // Let Ink handle the exit gracefully
        setTimeout(() => process.exit(code), 100);
      }}
    />
  );
};

// Interactive terminal example
export const InteractiveTerminalExample: React.FC = () => {
  return (
    <Terminal
      command="sh"
      args={[]}
      cwd="/Users/shunkakinoki/ghq/github.com/shunkakinoki/bun-playground"
      cols={80}
      rows={24}
      interactive={true}
      onExit={(code) => {
        console.log(`\nInteractive terminal exited with code: ${code}`);
        // For interactive terminals, let Ink handle the exit gracefully
        setTimeout(() => process.exit(code), 100);
      }}
    />
  );
};

// Render the example when this file is executed directly
if (import.meta.main) {
  console.log('🚀 Starting Terminal Example...');
  console.log('❯ pwd /Users/shunkakinoki/ghq/github.com/shunkakinoki/bun-playground\n');

  const { waitUntilExit } = render(
    React.createElement(TerminalExample),
    {
      patchConsole: false,
      exitOnCtrlC: true,
    }
  );

  waitUntilExit().catch((error) => {
    console.error('Error running terminal example:', error);
    process.exit(1);
  });
}
