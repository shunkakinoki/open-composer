#!/usr/bin/env bun

import React from 'react';
import { render } from 'ink';
import { Multiplexer } from '../src/index.js';
import type { Layout } from '../src/types.js';

/**
 * Simple 2-pane horizontal split with interactive shells
 * Demonstrates tmux-like appearance with no visible borders
 */
const layout: Layout = {
  type: 'split',
  id: 'root',
  direction: 'horizontal',
  children: [
    {
      type: 'pane',
      id: 'left',
      command: 'bash',
      args: ['-i'],  // Interactive shell
      focus: true,
    },
    {
      type: 'pane',
      id: 'right',
      command: 'bash',
      args: ['-i'],  // Interactive shell
    },
  ],
};

console.log('Starting tmux-like multiplexer...');
console.log('Full screen, clean pane appearance (no visible borders)');
console.log('Press Ctrl+B then ? to see all key bindings');
console.log('Press Ctrl+C twice to exit safely\n');

// Full screen mode with alternate screen buffer (no scrolling)
render(<Multiplexer layout={layout} enterFullScreen={true} />, {
  patchConsole: false,
  exitOnCtrlC: false,
});
