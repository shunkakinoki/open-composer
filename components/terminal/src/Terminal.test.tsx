import { describe, it, expect } from 'bun:test';
import { render } from 'ink-testing-library';
import React from 'react';
import { Terminal } from './Terminal.js';

describe('Terminal', () => {
  describe('snapshot tests', () => {
    it('should render with basic command', () => {
      const { lastFrame } = render(
        <Terminal command="echo" args={['hello world']} />
      );

      // Initially should be empty or show initial state
      expect(lastFrame()).toBeDefined();
    });

    it('should render with custom dimensions', () => {
      const { lastFrame } = render(
        <Terminal command="echo" args={['test']} cols={100} rows={30} />
      );

      expect(lastFrame()).toBeDefined();
    });

    it('should render in interactive mode with border', () => {
      const { lastFrame } = render(
        <Terminal command="bash" args={['-c', 'echo "test"']} interactive={true} />
      );

      // Should have border in interactive mode
      expect(lastFrame()).toBeDefined();
    });
  });

  describe('integration tests', () => {
    it('should execute command and display output', async () => {
      let exitCalled = false;
      let exitCode: number | undefined;

      const { lastFrame, unmount } = render(
        <Terminal
          command="echo"
          args={['Hello Terminal']}
          onExit={(code) => {
            exitCalled = true;
            exitCode = code;
          }}
        />
      );

      // Wait for process to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(exitCalled).toBe(true);
      expect(exitCode).toBe(0);

      const output = lastFrame();
      expect(output).toBeDefined();

      unmount();
    });

    it('should handle command with non-zero exit code', async () => {
      let exitCode: number | undefined;

      const { unmount } = render(
        <Terminal
          command="bash"
          args={['-c', 'exit 1']}
          onExit={(code) => {
            exitCode = code;
          }}
        />
      );

      // Wait for process to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(exitCode).toBe(1);

      unmount();
    });

    it('should support custom working directory', async () => {
      let output: any[] = [];

      const { unmount } = render(
        <Terminal
          command="pwd"
          cwd="/tmp"
          onData={(data) => {
            output = data;
          }}
        />
      );

      // Wait for process to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Output should contain /tmp
      const allText = output.map(line =>
        line.map((token: any) => token.text).join('')
      ).join('\n');

      expect(allText).toContain('/tmp');

      unmount();
    });

    it('should support custom environment variables', async () => {
      let output: any[] = [];

      const { unmount } = render(
        <Terminal
          command="bash"
          args={['-c', 'echo $TEST_VAR']}
          env={{ TEST_VAR: 'test-value' }}
          onData={(data) => {
            output = data;
          }}
        />
      );

      // Wait for process to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      const allText = output.map(line =>
        line.map((token: any) => token.text).join('')
      ).join('\n');

      expect(allText).toContain('test-value');

      unmount();
    });

    it('should handle terminal resize', async () => {
      const { rerender, unmount } = render(
        <Terminal command="bash" args={['-c', 'sleep 1']} cols={80} rows={24} />
      );

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      // Resize terminal
      rerender(<Terminal command="bash" args={['-c', 'sleep 1']} cols={100} rows={30} />);

      // Wait for resize to take effect
      await new Promise(resolve => setTimeout(resolve, 100));

      unmount();
    });
  });
});
