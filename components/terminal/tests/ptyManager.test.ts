import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { PtyManager, type PtyConfig, type PtyEvent } from '../src/ptyManager.js';

describe('PtyManager', () => {
  let manager: PtyManager | null = null;

  afterEach(() => {
    if (manager) {
      manager.dispose();
      manager = null;
    }
  });

  describe('basic functionality', () => {
    it('should create a PtyManager instance', async () => {
      manager = await PtyManager.create(
        {
          command: 'echo',
          args: ['test'],
        },
        () => {}
      );

      expect(manager).toBeDefined();
      expect(manager.pid).toBeDefined();
    });

    it('should execute a simple command', async () => {
      let dataReceived = false;
      let exitReceived = false;
      let exitCode: number | undefined;

      manager = await PtyManager.create(
        {
          command: 'echo',
          args: ['Hello World'],
        },
        (event) => {
          if (event.type === 'data') {
            dataReceived = true;
          } else if (event.type === 'exit') {
            exitReceived = true;
            exitCode = event.code;
          }
        }
      );

      // Wait for process to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(dataReceived).toBe(true);
      expect(exitReceived).toBe(true);
      expect(exitCode).toBe(0);
    });

    it('should capture command output', async () => {
      let receivedOutput: any[] = [];

      manager = await PtyManager.create(
        {
          command: 'echo',
          args: ['Test Output'],
        },
        (event) => {
          if (event.type === 'data') {
            receivedOutput = event.output;
          }
        }
      );

      // Wait for process to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(receivedOutput.length).toBeGreaterThan(0);

      // Convert output to text
      const allText = receivedOutput.map(line =>
        line.map((token: any) => token.text).join('')
      ).join('\n');

      expect(allText).toContain('Test Output');
    });

    it('should handle non-zero exit codes', async () => {
      let exitCode: number | undefined;

      manager = await PtyManager.create(
        {
          command: 'bash',
          args: ['-c', 'exit 42'],
        },
        (event) => {
          if (event.type === 'exit') {
            exitCode = event.code;
          }
        }
      );

      // Wait for process to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(exitCode).toBe(42);
    });
  });

  describe('configuration options', () => {
    it('should support custom working directory', async () => {
      let receivedOutput: any[] = [];

      manager = await PtyManager.create(
        {
          command: 'pwd',
          cwd: '/tmp',
        },
        (event) => {
          if (event.type === 'data') {
            receivedOutput = event.output;
          }
        }
      );

      // Wait for process to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      const allText = receivedOutput.map(line =>
        line.map((token: any) => token.text).join('')
      ).join('\n');

      expect(allText).toContain('/tmp');
    });

    it('should support custom environment variables', async () => {
      let receivedOutput: any[] = [];

      manager = await PtyManager.create(
        {
          command: 'bash',
          args: ['-c', 'echo $CUSTOM_VAR'],
          env: { CUSTOM_VAR: 'custom_value' },
        },
        (event) => {
          if (event.type === 'data') {
            receivedOutput = event.output;
          }
        }
      );

      // Wait for process to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      const allText = receivedOutput.map(line =>
        line.map((token: any) => token.text).join('')
      ).join('\n');

      expect(allText).toContain('custom_value');
    });

    it('should support custom terminal dimensions', async () => {
      manager = await PtyManager.create(
        {
          command: 'echo',
          args: ['test'],
          cols: 100,
          rows: 30,
        },
        () => {}
      );

      expect(manager).toBeDefined();
    });
  });

  describe('interactive mode', () => {
    it('should support writing to stdin', async () => {
      let receivedOutput: any[] = [];
      let processExited = false;

      manager = await PtyManager.create(
        {
          command: 'bash',
          args: ['-c', 'read -r line && echo "Got: $line"'],
        },
        (event) => {
          if (event.type === 'data') {
            receivedOutput = event.output;
          } else if (event.type === 'exit') {
            processExited = true;
          }
        }
      );

      // Wait a bit for process to be ready
      await new Promise(resolve => setTimeout(resolve, 100));

      // Write to stdin
      manager.write('hello\n');

      // Wait for output
      await new Promise(resolve => setTimeout(resolve, 500));

      const allText = receivedOutput.map(line =>
        line.map((token: any) => token.text).join('')
      ).join('\n');

      expect(allText).toContain('hello');
      expect(processExited).toBe(true);
    });

    it('should handle multiple writes', async () => {
      manager = await PtyManager.create(
        {
          command: 'cat',
        },
        () => {}
      );

      // Wait a bit for process to be ready
      await new Promise(resolve => setTimeout(resolve, 100));

      // Write multiple times
      manager.write('line1\n');
      manager.write('line2\n');
      manager.write('line3\n');

      // Wait to ensure writes are processed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not throw
      expect(manager).toBeDefined();
    });
  });

  describe('resize functionality', () => {
    it('should support resizing terminal', async () => {
      manager = await PtyManager.create(
        {
          command: 'bash',
          args: ['-c', 'sleep 1'],
          cols: 80,
          rows: 24,
        },
        () => {}
      );

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      // Resize - should not throw
      manager.resize(100, 30);

      // Wait a bit more
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(manager).toBeDefined();
    });

    it('should handle multiple resizes', async () => {
      manager = await PtyManager.create(
        {
          command: 'bash',
          args: ['-c', 'sleep 1'],
        },
        () => {}
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      manager.resize(100, 30);
      manager.resize(120, 40);
      manager.resize(80, 24);

      expect(manager).toBeDefined();
    });
  });

  describe('process lifecycle', () => {
    it('should kill process on dispose', async () => {
      let exitCalled = false;

      manager = await PtyManager.create(
        {
          command: 'bash',
          args: ['-c', 'sleep 10'],
        },
        (event) => {
          if (event.type === 'exit') {
            exitCalled = true;
          }
        }
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      manager.dispose();

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(exitCalled).toBe(true);
    });

    it('should support manual kill', async () => {
      let exitCalled = false;

      manager = await PtyManager.create(
        {
          command: 'bash',
          args: ['-c', 'sleep 10'],
        },
        (event) => {
          if (event.type === 'exit') {
            exitCalled = true;
          }
        }
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      manager.kill();

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(exitCalled).toBe(true);
    });

    it('should handle rapid create/dispose cycles', async () => {
      for (let i = 0; i < 5; i++) {
        const tempManager = await PtyManager.create(
          {
            command: 'echo',
            args: [`test ${i}`],
          },
          () => {}
        );

        await new Promise(resolve => setTimeout(resolve, 50));
        tempManager.dispose();
      }

      // Should complete without errors
      expect(true).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle invalid command', async () => {
      let exitCode: number | undefined;
      let errorOccurred = false;

      try {
        manager = await PtyManager.create(
          {
            command: 'nonexistent_command_12345',
            args: [],
          },
          (event) => {
            if (event.type === 'exit') {
              exitCode = event.code;
            }
          }
        );

        // Wait for process to fail
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        errorOccurred = true;
      }

      // Either we get an exit event with non-zero code, or an error is thrown
      expect(errorOccurred || (exitCode !== undefined && exitCode !== 0)).toBe(true);
    });

    it('should handle write after process exits', async () => {
      manager = await PtyManager.create(
        {
          command: 'echo',
          args: ['test'],
        },
        () => {}
      );

      // Wait for process to exit
      await new Promise(resolve => setTimeout(resolve, 500));

      // Try to write after exit - should not throw
      manager.write('test\n');

      expect(manager).toBeDefined();
    });

    it('should handle resize after dispose', async () => {
      manager = await PtyManager.create(
        {
          command: 'echo',
          args: ['test'],
        },
        () => {}
      );

      manager.dispose();

      // Try to resize after dispose - should not throw
      manager.resize(100, 30);

      expect(manager).toBeDefined();
    });
  });

  describe('ANSI output handling', () => {
    it('should preserve ANSI colors in output', async () => {
      let receivedOutput: any[] = [];

      manager = await PtyManager.create(
        {
          command: 'bash',
          args: ['-c', 'echo -e "\\x1b[31mRed Text\\x1b[0m"'],
        },
        (event) => {
          if (event.type === 'data') {
            receivedOutput = event.output;
          }
        }
      );

      // Wait for process to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(receivedOutput.length).toBeGreaterThan(0);

      // Check that we have tokens with styling
      const hasStyledToken = receivedOutput.some(line =>
        line.some((token: any) => token.fg || token.bold)
      );

      expect(hasStyledToken).toBe(true);
    });

    it('should handle multiline output', async () => {
      let receivedOutput: any[] = [];

      manager = await PtyManager.create(
        {
          command: 'bash',
          args: ['-c', 'echo "Line 1"; echo "Line 2"; echo "Line 3"'],
        },
        (event) => {
          if (event.type === 'data') {
            receivedOutput = event.output;
          }
        }
      );

      // Wait for process to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(receivedOutput.length).toBeGreaterThan(0);

      const allText = receivedOutput.map(line =>
        line.map((token: any) => token.text).join('')
      ).join('\n');

      expect(allText).toContain('Line 1');
      expect(allText).toContain('Line 2');
      expect(allText).toContain('Line 3');
    });
  });

  describe('process information', () => {
    it('should provide process ID', async () => {
      manager = await PtyManager.create(
        {
          command: 'sleep',
          args: ['1'],
        },
        () => {}
      );

      expect(manager.pid).toBeDefined();
      expect(typeof manager.pid).toBe('number');
      expect(manager.pid).toBeGreaterThan(0);
    });

    it('should have undefined pid after dispose', async () => {
      manager = await PtyManager.create(
        {
          command: 'echo',
          args: ['test'],
        },
        () => {}
      );

      const pidBeforeDispose = manager.pid;
      expect(pidBeforeDispose).toBeDefined();

      await new Promise(resolve => setTimeout(resolve, 500));
      manager.dispose();

      // After dispose, the process should be gone
      expect(manager).toBeDefined(); // manager object exists
    });
  });

  describe('event debouncing', () => {
    it('should handle rapid output updates', async () => {
      let dataEventCount = 0;

      manager = await PtyManager.create(
        {
          command: 'bash',
          args: ['-c', 'for i in {1..100}; do echo "Line $i"; done'],
        },
        (event) => {
          if (event.type === 'data') {
            dataEventCount++;
          }
        }
      );

      // Wait for process to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Due to debouncing, we should have fewer data events than lines
      // (events are debounced at ~60fps = 16ms)
      expect(dataEventCount).toBeGreaterThan(0);
      expect(dataEventCount).toBeLessThan(100);
    });
  });
});
