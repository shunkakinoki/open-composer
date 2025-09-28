import { Box } from "ink";
import type React from "react";
import { useState } from "react";
import { ChatInterface } from "./ChatInterface.js";
import { CodeEditor } from "./CodeEditor.js";
import { Layout } from "./Layout.js";
import { Sidebar } from "./Sidebar.js";

// Utility function for creating timestamps - can be mocked in tests
export const createTimestamp = () => new Date();
export const getCurrentTime = () => Date.now();

export interface ComposerAppState {
  currentBranch: string;
  currentFile?: string;
  chatMessages: Array<{
    id: string;
    content: string;
    sender: "user" | "agent";
    agent?: string;
    timestamp: Date;
  }>;
  worktrees: Array<{
    name: string;
    path: string;
    branch: string;
    active: boolean;
  }>;
}

export const ComposerApp: React.FC = () => {
  const [state, setState] = useState<ComposerAppState>({
    currentBranch: "main",
    chatMessages: [
      {
        id: "1",
        content: "Welcome to Open Composer CLI! What would you like to build?",
        sender: "agent",
        agent: "composer",
        timestamp: createTimestamp(),
      },
    ],
    worktrees: [
      {
        name: "main",
        path: process.cwd(),
        branch: "main",
        active: true,
      },
    ],
  });

  const handleSendMessage = (message: string) => {
    const newMessage = {
      id: getCurrentTime().toString(),
      content: message,
      sender: "user" as const,
      timestamp: createTimestamp(),
    };

    setState((prev) => ({
      ...prev,
      chatMessages: [...prev.chatMessages, newMessage],
    }));

    // Mock agent response
    setTimeout(() => {
      const agentResponse = {
        id: (getCurrentTime() + 1).toString(),
        content: `I'll help you with: "${message}". Let me analyze your request...`,
        sender: "agent" as const,
        agent: "claude-code",
        timestamp: createTimestamp(),
      };

      setState((prev) => ({
        ...prev,
        chatMessages: [...prev.chatMessages, agentResponse],
      }));
    }, 1000);
  };

  return (
    <Layout>
      <Box flexDirection="row" height="100%">
        <Box width="30%" borderStyle="single" borderColor="gray">
          <Sidebar
            worktrees={state.worktrees}
            currentBranch={state.currentBranch}
          />
        </Box>

        <Box width="40%" borderStyle="single" borderColor="gray">
          <ChatInterface
            messages={state.chatMessages}
            onSendMessage={handleSendMessage}
          />
        </Box>

        <Box width="30%" borderStyle="single" borderColor="gray">
          <CodeEditor currentFile={state.currentFile} />
        </Box>
      </Box>
    </Layout>
  );
};
