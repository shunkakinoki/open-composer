import { describe, expect, test } from "bun:test";

import { ChatInterface } from "../../src/components/ChatInterface.js";
import { render } from "../utils.js";

describe("ChatInterface", () => {
  test("renders correctly with messages", () => {
    const messages = [
      {
        id: "1",
        content: "Hello, how can I help you?",
        sender: "agent" as const,
        agent: "claude-code",
        timestamp: new Date("2024-01-01T10:00:00"),
      },
      {
        id: "2",
        content: "I need help with my code",
        sender: "user" as const,
        timestamp: new Date("2024-01-01T10:01:00"),
      },
    ];

    const { lastFrame } = render(
      <ChatInterface messages={messages} onSendMessage={() => {}} />,
    );
    expect(lastFrame()).toMatchSnapshot();
  });
});
