import { Box, Text, useInput, useStdout } from "ink";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Terminal as XTerminal } from "@xterm/headless";
import { EventSource } from "eventsource";

interface TerminalProps {
  /**
   * Server URL (e.g., http://localhost:3000)
   */
  serverUrl?: string;
  /**
   * Session ID for the PTY
   */
  sessionId?: string;
  /**
   * Shell command to execute
   */
  cmd?: string[];
  /**
   * Working directory
   */
  cwd?: string;
  /**
   * Environment variables
   */
  env?: Record<string, string>;
  /**
   * Callback when terminal exits
   */
  onExit?: (code: number) => void;
}

/**
 * Terminal component that connects to the server's PTY endpoints
 * and renders a terminal session using Ink and xterm.js headless
 */
export const Terminal: React.FC<TerminalProps> = ({
  serverUrl = "http://localhost:3000",
  sessionId = "default",
  cmd = [process.env.SHELL || "/bin/bash"],
  cwd = process.cwd(),
  env = {},
  onExit,
}) => {
  const [ptyId, setPtyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const terminalRef = useRef<XTerminal | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const { stdout } = useStdout();

  // Initialize terminal dimensions based on stdout
  const cols = stdout?.columns || 80;
  const rows = stdout?.rows || 24;

  // Create PTY on mount (only once)
  useEffect(() => {
    if (ptyId) return; // Already have a PTY, don't create another

    let mounted = true;
    let timeoutId: Timer;

    const createPTY = async () => {
      try {
        // Add timeout for PTY creation
        timeoutId = setTimeout(() => {
          if (mounted && !ptyId) {
            setError("PTY creation timed out after 10 seconds");
            setIsConnecting(false);
          }
        }, 10000);

        const response = await fetch(`${serverUrl}/session/${sessionId}/pty`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cmd,
            cwd,
            env,
            cols,
            rows,
          }),
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Server returned ${response.status}`);
        }

        const data = await response.json();

        if (mounted) {
          setPtyId(data.ptyID);
          setIsConnecting(false);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        if (mounted) {
          setError(
            err instanceof Error ? err.message : "Failed to create PTY"
          );
          setIsConnecting(false);
        }
      }
    };

    createPTY();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [serverUrl, sessionId, cmd, cwd, env, cols, rows]);

  // Connect to PTY stream when PTY is created
  useEffect(() => {
    if (!ptyId) return;

    // Initialize headless terminal
    const term = new XTerminal({ cols, rows, allowProposedApi: true });
    terminalRef.current = term;

    // Connect to SSE stream
    const streamUrl = `${serverUrl}/session/${sessionId}/pty/${ptyId}/stream`;
    const eventSource = new EventSource(streamUrl);
    eventSourceRef.current = eventSource;

    // Handle snapshot (initial state)
    eventSource.addEventListener("snapshot", (event) => {
      const { data } = JSON.parse(event.data);
      term.write(data);
      updateTerminalOutput(term);
    });

    // Handle incremental data
    eventSource.addEventListener("data", (event) => {
      const { data } = JSON.parse(event.data);
      term.write(data);
      updateTerminalOutput(term);
    });

    // Handle exit event
    eventSource.addEventListener("exit", (event) => {
      const { code } = JSON.parse(event.data);
      eventSource.close();
      onExit?.(code);
    });

    // Handle errors
    eventSource.onerror = () => {
      if (eventSource.readyState === EventSource.CLOSED) {
        eventSource.close();
        setError("Lost connection to terminal");
      }
    };

    // Helper to extract visible lines from terminal
    function updateTerminalOutput(terminal: XTerminal) {
      const lines: string[] = [];
      const buffer = terminal.buffer.active;

      for (let i = 0; i < buffer.length; i++) {
        const line = buffer.getLine(i);
        if (line) {
          lines.push(line.translateToString(true));
        }
      }

      setTerminalOutput(lines);
    }

    return () => {
      eventSource.close();
      if (terminalRef.current) {
        terminalRef.current.dispose();
      }
    };
  }, [ptyId, serverUrl, sessionId, cols, rows, onExit]);

  // Handle keyboard input (only if stdin is a TTY)
  useInput(
    (input, key) => {
      if (!ptyId) return;

      let data = "";

      // Special keys
      if (key.return) {
        data = "\r";
      } else if (key.backspace || key.delete) {
        data = "\x7f";
      } else if (key.upArrow) {
        data = "\x1b[A";
      } else if (key.downArrow) {
        data = "\x1b[B";
      } else if (key.leftArrow) {
        data = "\x1b[D";
      } else if (key.rightArrow) {
        data = "\x1b[C";
      } else if (key.tab) {
        data = "\t";
      } else if (key.escape) {
        data = "\x1b";
      } else if (key.ctrl) {
        // Handle Ctrl+C, Ctrl+D, etc.
        if (input === "c") {
          data = "\x03";
        } else if (input === "d") {
          data = "\x04";
        } else if (input === "z") {
          data = "\x1a";
        } else if (input === "a") {
          data = "\x01";
        } else if (input === "e") {
          data = "\x05";
        } else if (input === "k") {
          data = "\x0b";
        } else if (input === "u") {
          data = "\x15";
        } else if (input === "w") {
          data = "\x17";
        } else if (input === "l") {
          data = "\x0c";
        }
      } else {
        // Regular character
        data = input;
      }

      if (data) {
        // Send input to PTY
        fetch(`${serverUrl}/session/${sessionId}/pty/${ptyId}/input`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        }).catch((err) => {
          console.error("Failed to send input:", err);
        });
      }
    },
    { isActive: !!ptyId && process.stdin.isTTY }
  );

  // Handle terminal resize
  useEffect(() => {
    if (!ptyId || !stdout) return;

    const resizePTY = async () => {
      try {
        await fetch(`${serverUrl}/session/${sessionId}/pty/${ptyId}/resize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cols: stdout.columns || 80,
            rows: stdout.rows || 24,
          }),
        });

        // Also resize the headless terminal
        if (terminalRef.current) {
          terminalRef.current.resize(
            stdout.columns || 80,
            stdout.rows || 24
          );
        }
      } catch (err) {
        console.error("Failed to resize PTY:", err);
      }
    };

    // Listen for stdout resize events if supported
    const onResize = () => {
      resizePTY();
    };

    // Check if stdout supports resize events
    if (stdout && "on" in stdout && typeof stdout.on === "function") {
      stdout.on("resize", onResize);
      return () => {
        if ("off" in stdout && typeof stdout.off === "function") {
          stdout.off("resize", onResize);
        }
      };
    }
  }, [ptyId, serverUrl, sessionId, stdout]);

  // Cleanup PTY on unmount
  useEffect(() => {
    return () => {
      if (ptyId) {
        fetch(`${serverUrl}/session/${sessionId}/pty/${ptyId}`, {
          method: "DELETE",
        }).catch((err) => {
          console.error("Failed to cleanup PTY:", err);
        });
      }
    };
  }, [ptyId, serverUrl, sessionId]);

  // Render terminal UI
  if (isConnecting) {
    return (
      <Box flexDirection="column">
        <Text color="cyan">Connecting to terminal...</Text>
        <Text color="gray">Server: {serverUrl}</Text>
        <Text color="gray">Session: {sessionId}</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {error}</Text>
      </Box>
    );
  }

  // Show terminal output
  if (terminalOutput.length === 0) {
    return (
      <Box flexDirection="column">
        <Text color="yellow">Connected. Waiting for output...</Text>
        <Text color="gray">PTY ID: {ptyId}</Text>
        <Text color="gray">Press Ctrl+C to exit</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {terminalOutput.map((line, index) => (
        <Text key={`terminal-line-${index}`}>{line}</Text>
      ))}
    </Box>
  );
};
