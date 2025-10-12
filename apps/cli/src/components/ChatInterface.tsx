import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import type React from "react";
import { useState } from "react";

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

  useKeyboard((key) => {
    if (key.name === "return") {
      if (input.trim()) {
        onSendMessage(input.trim());
        setInput("");
      }
    } else if (key.name === "backspace" || key.name === "delete") {
      setInput((prev) => prev.slice(0, -1));
    } else if (key.sequence && key.sequence.length === 1 && !key.ctrl && !key.meta) {
      setInput((prev) => prev + key.sequence);
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
    <box style={{ flexDirection: "column", padding: 1 }}>
      <text
        content="💬 Chat Interface"
        style={{ fg: "green", attributes: TextAttributes.BOLD }}
      />

      <box style={{ flexDirection: "column", flexGrow: 1, marginTop: 1 }}>
        {messages.map((message) => (
          <box key={message.id} style={{ flexDirection: "column", marginBottom: 1 }}>
            <box>
              <text
                content={`${message.sender === "user" ? "👤" : getAgentIcon(message.agent)} ${message.sender === "user" ? "You" : message.agent || "Agent"}`}
                style={{ fg: message.sender === "user" ? "cyan" : "yellow" }}
              />
              <text
                content={` ${formatTime(message.timestamp)}`}
                style={{ fg: "gray" }}
              />
            </box>
            <text content={` ${message.content}`} />
          </box>
        ))}
      </box>

      <box style={{ border: true, borderColor: "blue", marginTop: 1 }}>
        <text content="💭 " style={{ fg: "blue" }} />
        <text content={input} />
        <text content="_" style={{ fg: "gray" }} />
      </box>

      <text content="Type your message and press Enter..." style={{ fg: "gray" }} />
    </box>
  );
};
