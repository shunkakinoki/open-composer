#!/usr/bin/env bun

import React from 'react';
import { render } from 'ink';
import { Multiplexer, type Layout } from '../src/index.js';

/**
 * Example showing how to use the Multiplexer component
 * This demonstrates calling <Multiplexer /> with multiple terminal panes,
 * including one showing a pwd command output
 *
 * IMPORTANT: The multiplexer requires interactive input to work properly.
 *
 * ❌ WRONG: bun run components/multiplexer/examples/multiplexer-example.tsx
 * ✅ RIGHT: ./components/multiplexer/examples/multiplexer-example.tsx
 *
 * The multiplexer will show an error when run through script runners.
 */
export const MultiplexerExample: React.FC = () => {
  // Define a layout with two panes: one showing pwd, another showing an interactive shell
  const layout: Layout = {
    type: 'split',
    id: 'root',
    direction: 'horizontal',
    children: [
      {
        type: 'pane',
        id: 'pwd-pane',
        title: 'Current Directory',
        command: 'pwd',
        cwd: '/Users/shunkakinoki/ghq/github.com/shunkakinoki/bun-playground',
        interactive: false,
        focus: true, // Start focused on this pane
      },
      {
        type: 'pane',
        id: 'shell-pane',
        title: 'Interactive Shell',
        command: 'bash',
        args: ['-i'],
        cwd: '/Users/shunkakinoki/ghq/github.com/shunkakinoki/bun-playground',
        interactive: true,
      },
    ],
  };

  return (
    <Multiplexer
      layout={layout}
      showHelp={true}
      showBorders={true}
      enterFullScreen={false}
    />
  );
};

// Alternative example with vertical split and more panes
export const VerticalMultiplexerExample: React.FC = () => {
  const layout: Layout = {
    type: 'split',
    id: 'root',
    direction: 'vertical',
    children: [
      {
        type: 'pane',
        id: 'top-pane',
        title: 'Project Root',
        command: 'pwd',
        cwd: '/Users/shunkakinoki/ghq/github.com/shunkakinoki/open-composer',
        interactive: false,
      },
      {
        type: 'split',
        id: 'bottom-split',
        direction: 'horizontal',
        children: [
          {
            type: 'pane',
            id: 'bottom-left',
            title: 'Bun Playground',
            command: 'pwd',
            cwd: '/Users/shunkakinoki/ghq/github.com/shunkakinoki/bun-playground',
            interactive: false,
          },
          {
            type: 'pane',
            id: 'bottom-right',
            title: 'Terminal',
            command: 'bash',
            args: ['-i'],
            cwd: '/Users/shunkakinoki/ghq/github.com/shunkakinoki/bun-playground',
            interactive: true,
            focus: true,
          },
        ],
      },
    ],
  };

  return (
    <Multiplexer
      layout={layout}
      showHelp={true}
      showBorders={true}
      enterFullScreen={false}
      prefixKey="b" // Use Ctrl+B for commands
    />
  );
};

// Render the example when this file is executed directly
if (import.meta.main) {
  // Check if stdin supports interactive input (required for multiplexer)
  if (!process.stdin.isTTY) {
    console.error('❌ ERROR: Terminal multiplexer requires interactive input, which is not available here.');
    console.error('');
    console.error('This usually happens when running through script runners like "bun run"');
    console.error('or in environments that don\'t support interactive input.');
    console.error('');
    console.error('✅ SOLUTION: For interactive multiplexer, run this file directly:');
    console.error('   ./components/multiplexer/examples/multiplexer-example.tsx');
    console.error('');
    console.error('First make sure it\'s executable:');
    console.error('   chmod +x components/multiplexer/examples/multiplexer-example.tsx');
    console.error('');
    console.error('💡 TIP: Use the terminal examples for non-interactive testing:');
    console.error('   bun run components/terminal/examples/terminal-example.tsx');
    console.error('');
    process.exit(1);
  }

  console.log('🚀 Starting Multiplexer Example...');
  console.log('This example shows multiple terminal panes including one with pwd output');
  console.log('Use Ctrl+B n/p to navigate between panes, Ctrl+C twice to exit\n');

  const { waitUntilExit } = render(
    <MultiplexerExample />,
    {
      patchConsole: false,
      exitOnCtrlC: false, // Let multiplexer handle exit
    }
  );

  // Wait for the multiplexer to exit
  waitUntilExit().then(() => {
    console.log('\n✨ Multiplexer example completed');
    process.exit(0);
  }).catch((error) => {
    console.error('Error running multiplexer example:', error);
    process.exit(1);
  });
}
