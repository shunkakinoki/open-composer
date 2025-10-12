import { TextAttributes } from "@opentui/core";

import { useKeyboard } from "@opentui/react"; 
import type React from "react";
import { useEffect, useState } from "react";

interface FeedbackPromptProps {
  onSubmit: (email: string, message: string) => void;
  onCancel?: () => void;
}

export const FeedbackPrompt: React.FC<FeedbackPromptProps> = ({
  onSubmit,
  onCancel,
}) => {
  const [step, setStep] = useState<"email" | "message">("email");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [currentInput, setCurrentInput] = useState("");
  

  useEffect(() => {
    if (step === "email") {
      setCurrentInput(email);
    } else {
      setCurrentInput(message);
    }
  }, [step, email, message]);

  useKeyboard(
    (key) => {
      if (key.name === "escape" || (key.ctrl && key.sequence === "c")) {
        onCancel?.();
        process.exit(0);
      } else if (key.name === "return") {
        if (key.shift && step === "message") {
          setCurrentInput((prev) => `${prev}\n`);
        } else {
          if (step === "email" && currentInput.trim()) {
            setEmail(currentInput);
            setStep("message");
          } else if (step === "message" && currentInput.trim()) {
            setMessage(currentInput);
            onSubmit(email, currentInput);
            process.exit(0);
          }
        }
      } else if (key.name === "backspace" || key.name === "delete") {
        setCurrentInput((prev) => prev.slice(0, -1));
      } else if (key.sequence && key.sequence.length === 1 && !key.ctrl && !key.meta) {
        setCurrentInput((prev) => prev + input);
      }
    },
    { isActive: true },
  );

  return (
    <box flexDirection="column" padding={2}>
      <text content="💬 Share your feedback with Open Composer's team" style={{ fg: "cyan", attributes: TextAttributes.BOLD }} />

      <box marginTop={1} marginBottom={1}>
        {step === "email" ? (
          <box>
            <text content="? Email: " />
            <text content={currentInput || "your@email.com"} style={{ fg: currentInput ? undefined : "gray" }} />
            <text content="_" style={{ fg: "gray" }} />
          </box>
        ) : (
          <box flexDirection="column">
            <text content="? Share your feedback with Open Composer's team (Enter to send, Shift+Enter for a newline)" />
            <box flexDirection="column">
              {currentInput.split("\n").map((line, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: Bypass feedback line key warning
                <text
                  key={line + i}
                  content={line || (i === 0 ? "Your feedback here..." : "")}
                  style={!line && i === 0 ? { fg: "gray" } : undefined}
                />
              ))}
              <text content="_" style={{ fg: "gray" }} />
            </box>
          </box>
        )}
      </box>

      <box marginTop={1}>
        <text content="Press Enter to continue, Escape to cancel" style={{ fg: "gray" }} />
      </box>
    </box>
  );
};
