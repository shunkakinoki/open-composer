// biome-ignore assist/source/organizeImports: False positive
import type React from "react";
import { useState } from "react";
import { Box, Text, useInput } from "ink";

interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "agent";
  agent?: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
}) => {
  const [input, setInput] = useState("");
  const [_isTyping, _setIsTypingg] = useState(false);

  useInput((input, key) => {
    if (key.return) {
      if (input.trim()) {
        onSendMessage(input.trim());
        setInput("");
      }
    } else if (key.backspace || key.delete) {
      setInput((prev) => prev.slice(0, -1));
    } else if (input.length === 1 && !key.ctrl && !key.meta) {
      setInput((prev) => prev + input);
    }
  });

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getAgentIcon = (agent?: string) => {
    switch (agent) {
      case "claude-code":
        return "🤖";
      case "codex-nation":
        return "📝";
      case "cursor-agent":
        return "🖱️";
      default:
        return "🎼";
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="green">
        💬 Chat Interface
      </Text>

      <Box flexDirection="column" flexGrow={1} marginTop={1}>
        {messages.map((message) => (
          <Box key={message.id} flexDirection="column" marginBottom={1}>
            <Box>
              <Text color={message.sender === "user" ? "cyan" : "yellow"}>
                {message.sender === "user" ? "👤" : getAgentIcon(message.agent)}{" "}
                {message.sender === "user" ? "You" : message.agent || "Agent"}
              </Text>
              <Text color="gray" dimColor>
                {" "}
                {formatTime(message.timestamp)}
              </Text>
            </Box>
            <Text> {message.content}</Text>
          </Box>
        ))}
      </Box>

      <Box borderStyle="single" borderColor="blue" marginTop={1}>
        <Text color="blue">💭 </Text>
        <Text>{input}</Text>
        <Text color="gray" dimColor>
          _
        </Text>
      </Box>

      <Text color="gray" dimColor>
        Type your message and press Enter...
      </Text>
    </Box>
  );
};
