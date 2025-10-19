#!/usr/bin/env bun

import React from 'react';
import { render } from 'ink';
import { Terminal } from '../src/index.js';

/**
 * Interactive Terminal Example
 *
 * This example shows how to create a truly interactive terminal using the Terminal component.
 *
 * IMPORTANT: Interactive terminals require raw mode support, which means you MUST run
 * this file directly, NOT through 'bun run' or other script runners.
 *
 * ❌ WRONG: bun run components/terminal/examples/interactive-terminal-example.tsx
 * ✅ RIGHT: ./components/terminal/examples/interactive-terminal-example.tsx
 *
 * Setup:
 *   chmod +x components/terminal/examples/interactive-terminal-example.tsx
 *   ./components/terminal/examples/interactive-terminal-example.tsx
 *
 * The terminal will exit immediately if run through 'bun run' because raw mode is not supported.
 */

export const InteractiveTerminalExample: React.FC = () => {
  return (
    <Terminal
      command="bash"
      args={[]}
      cwd="/Users/shunkakinoki/ghq/github.com/shunkakinoki/bun-playground"
      cols={80}
      rows={80}
      interactive={true}
      onExit={(code) => {
        console.log(`\nTerminal exited with code: ${code}`);
        setTimeout(() => process.exit(code), 100);
      }}
    />
  );
};

// Render the example when this file is executed directly
if (import.meta.main) {
  // Check if stdin supports raw mode (required for interactive terminals)
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    console.error('❌ ERROR: Interactive terminals require raw mode support, which is not available here.');
    console.error('');
    console.error('This usually happens when running through script runners like "bun run"');
    console.error('or in environments that don\'t support interactive input.');
    console.error('');
    console.error('✅ SOLUTION: For interactive terminals, run this file directly:');
    console.error('   ./components/terminal/examples/interactive-terminal-example.tsx');
    console.error('');
    console.error('First make sure it\'s executable:');
    console.error('   chmod +x components/terminal/examples/interactive-terminal-example.tsx');
    console.error('');
    console.error('💡 TIP: Use the non-interactive example for testing:');
    console.error('   bun run components/terminal/examples/terminal-example.tsx');
    console.error('');
    process.exit(1);
  }

  console.log('🚀 Starting Interactive Terminal...');
  console.log('Welcome to the interactive bash shell!');
  console.log('Type commands and press Enter. Press Ctrl+C to exit.\n');

  const { waitUntilExit } = render(
    React.createElement(InteractiveTerminalExample),
    {
      patchConsole: false,
      exitOnCtrlC: false, // Let the terminal handle Ctrl+C
    }
  );

  waitUntilExit().catch((error) => {
    console.error('Error running interactive terminal:', error);
    process.exit(1);
  });
}
