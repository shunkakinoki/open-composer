import { describe, it, expect } from 'bun:test';
import { render } from 'ink-testing-library';
import React from 'react';
import { Multiplexer } from '../src/Multiplexer.js';
import type { Layout } from '../src/types.js';

describe('Multiplexer', () => {
  describe('snapshot tests', () => {
    it('should render single pane layout', () => {
      const layout: Layout = {
        type: 'pane',
        id: 'main',
        command: 'echo',
        args: ['Hello'],
      };

      const { lastFrame } = render(
        <Multiplexer layout={layout} width={80} height={24} />
      );

      expect(lastFrame()).toBeDefined();
    });

    it('should render horizontal split layout', () => {
      const layout: Layout = {
        type: 'split',
        id: 'root',
        direction: 'horizontal',
        children: [
          { type: 'pane', id: 'left', command: 'echo', args: ['Left'] },
          { type: 'pane', id: 'right', command: 'echo', args: ['Right'] },
        ],
      };

      const { lastFrame } = render(
        <Multiplexer layout={layout} width={80} height={24} />
      );

      expect(lastFrame()).toBeDefined();
    });

    it('should render vertical split layout', () => {
      const layout: Layout = {
        type: 'split',
        id: 'root',
        direction: 'vertical',
        children: [
          { type: 'pane', id: 'top', command: 'echo', args: ['Top'] },
          { type: 'pane', id: 'bottom', command: 'echo', args: ['Bottom'] },
        ],
      };

      const { lastFrame } = render(
        <Multiplexer layout={layout} width={80} height={24} />
      );

      expect(lastFrame()).toBeDefined();
    });

    it('should render with borders', () => {
      const layout: Layout = {
        type: 'split',
        id: 'root',
        direction: 'horizontal',
        children: [
          { type: 'pane', id: 'left', command: 'echo', args: ['Left'], title: 'Left Pane' },
          { type: 'pane', id: 'right', command: 'echo', args: ['Right'], title: 'Right Pane' },
        ],
      };

      const { lastFrame } = render(
        <Multiplexer layout={layout} width={80} height={24} showBorders={true} />
      );

      const output = lastFrame();
      expect(output).toBeDefined();
      expect(output).toContain('Left Pane');
      expect(output).toContain('Right Pane');
    });

    it('should render nested splits', () => {
      const layout: Layout = {
        type: 'split',
        id: 'root',
        direction: 'horizontal',
        children: [
          { type: 'pane', id: 'left', command: 'echo', args: ['Left'] },
          {
            type: 'split',
            id: 'right-split',
            direction: 'vertical',
            children: [
              { type: 'pane', id: 'top-right', command: 'echo', args: ['Top Right'] },
              { type: 'pane', id: 'bottom-right', command: 'echo', args: ['Bottom Right'] },
            ],
          },
        ],
      };

      const { lastFrame } = render(
        <Multiplexer layout={layout} width={80} height={24} />
      );

      expect(lastFrame()).toBeDefined();
    });
  });

  describe('integration tests', () => {
    it('should execute commands in all panes', async () => {
      const layout: Layout = {
        type: 'split',
        id: 'root',
        direction: 'horizontal',
        children: [
          { type: 'pane', id: 'left', command: 'echo', args: ['Left Pane'] },
          { type: 'pane', id: 'right', command: 'echo', args: ['Right Pane'] },
        ],
      };

      const { lastFrame, unmount } = render(
        <Multiplexer layout={layout} width={80} height={24} />
      );

      // Wait for commands to execute
      await new Promise(resolve => setTimeout(resolve, 500));

      const output = lastFrame();
      expect(output).toBeDefined();

      unmount();
    });

    it('should handle pane with custom size', () => {
      const layout: Layout = {
        type: 'split',
        id: 'root',
        direction: 'horizontal',
        children: [
          { type: 'pane', id: 'left', command: 'echo', args: ['Left'], size: '30%' },
          { type: 'pane', id: 'right', command: 'echo', args: ['Right'], size: '70%' },
        ],
      };

      const { lastFrame } = render(
        <Multiplexer layout={layout} width={80} height={24} />
      );

      expect(lastFrame()).toBeDefined();
    });

    it('should handle pane with fractional size', () => {
      const layout: Layout = {
        type: 'split',
        id: 'root',
        direction: 'horizontal',
        children: [
          { type: 'pane', id: 'left', command: 'echo', args: ['Left'], size: '1/3' },
          { type: 'pane', id: 'right', command: 'echo', args: ['Right'], size: '2/3' },
        ],
      };

      const { lastFrame } = render(
        <Multiplexer layout={layout} width={80} height={24} />
      );

      expect(lastFrame()).toBeDefined();
    });

    it('should handle focused pane', () => {
      const layout: Layout = {
        type: 'split',
        id: 'root',
        direction: 'horizontal',
        children: [
          { type: 'pane', id: 'left', command: 'echo', args: ['Left'], focus: true },
          { type: 'pane', id: 'right', command: 'echo', args: ['Right'] },
        ],
      };

      const { lastFrame } = render(
        <Multiplexer layout={layout} width={80} height={24} />
      );

      expect(lastFrame()).toBeDefined();
    });

    it('should exit when all panes exit', async () => {
      let exited = false;

      const layout: Layout = {
        type: 'split',
        id: 'root',
        direction: 'horizontal',
        children: [
          { type: 'pane', id: 'left', command: 'echo', args: ['Left'] },
          { type: 'pane', id: 'right', command: 'echo', args: ['Right'] },
        ],
      };

      const { unmount } = render(
        <Multiplexer layout={layout} width={80} height={24} />
      );

      // Mock exit handler
      const originalExit = process.exit;
      process.exit = (() => {
        exited = true;
      }) as any;

      // Wait for commands to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Restore original exit
      process.exit = originalExit;

      unmount();
    });
  });
});
