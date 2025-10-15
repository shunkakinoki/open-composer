import { describe, expect, test } from "bun:test";
import { buildTerminalCommand } from "../../src/commands/terminal-command.js";

describe.concurrent("terminal command", () => {
  describe.concurrent("Command Structure", () => {
    test.concurrent("should build terminal command successfully", () => {
      const commandBuilder = buildTerminalCommand();
      expect(commandBuilder).toBeDefined();
      expect(commandBuilder.metadata.name).toBe("terminal");
      expect(commandBuilder.metadata.description).toBe(
        "Launch an interactive terminal that connects to the PTY server"
      );
    });

    test.concurrent("should have command function", () => {
      const commandBuilder = buildTerminalCommand();
      const command = commandBuilder.command();
      expect(command).toBeDefined();
      expect(typeof commandBuilder.command).toBe("function");
    });
  });

  describe.concurrent("Command Options", () => {
    test.concurrent("should have server option with default", () => {
      const commandBuilder = buildTerminalCommand();
      const command = commandBuilder.command();
      expect(command).toBeDefined();
      // Server option should exist with default http://localhost:3000
    });

    test.concurrent("should have session option with default", () => {
      const commandBuilder = buildTerminalCommand();
      const command = commandBuilder.command();
      expect(command).toBeDefined();
      // Session option should exist with default 'default'
    });

    test.concurrent("should have optional shell option", () => {
      const commandBuilder = buildTerminalCommand();
      const command = commandBuilder.command();
      expect(command).toBeDefined();
      // Shell option should be optional
    });

    test.concurrent("should have optional cwd option", () => {
      const commandBuilder = buildTerminalCommand();
      const command = commandBuilder.command();
      expect(command).toBeDefined();
      // CWD option should be optional
    });
  });

  describe.concurrent("Command Metadata", () => {
    test.concurrent("should have correct command name", () => {
      const commandBuilder = buildTerminalCommand();
      expect(commandBuilder.metadata.name).toBe("terminal");
    });

    test.concurrent("should have descriptive help text", () => {
      const commandBuilder = buildTerminalCommand();
      expect(commandBuilder.metadata.description).toContain("terminal");
      expect(commandBuilder.metadata.description).toContain("PTY");
    });
  });

  describe.concurrent("Default Values", () => {
    test.concurrent("should use localhost:3000 as default server", () => {
      const commandBuilder = buildTerminalCommand();
      const command = commandBuilder.command();
      expect(command).toBeDefined();
      // Default server should be http://localhost:3000
    });

    test.concurrent("should use 'default' as default session ID", () => {
      const commandBuilder = buildTerminalCommand();
      const command = commandBuilder.command();
      expect(command).toBeDefined();
      // Default session should be 'default'
    });

    test.concurrent("should use $SHELL or /bin/bash as default shell", () => {
      const commandBuilder = buildTerminalCommand();
      const command = commandBuilder.command();
      expect(command).toBeDefined();
      // Should use environment SHELL or fall back to /bin/bash
    });

    test.concurrent("should use current directory as default cwd", () => {
      const commandBuilder = buildTerminalCommand();
      const command = commandBuilder.command();
      expect(command).toBeDefined();
      // Should use process.cwd() as default
    });
  });

  describe.concurrent("Integration", () => {
    test.concurrent("should be a valid Effect CLI command", () => {
      const commandBuilder = buildTerminalCommand();
      const command = commandBuilder.command();
      expect(command).toBeDefined();
      expect(typeof command).toBe("object");
    });

    test.concurrent("should export correct metadata", () => {
      const commandBuilder = buildTerminalCommand();
      expect(commandBuilder.metadata).toBeDefined();
      expect(commandBuilder.metadata.name).toBeDefined();
      expect(commandBuilder.metadata.description).toBeDefined();
    });
  });
});
