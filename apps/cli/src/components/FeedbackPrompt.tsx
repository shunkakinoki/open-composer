import { Box, Text, useApp, useInput } from "ink";
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
  const { exit } = useApp();

  useEffect(() => {
    if (step === "email") {
      setCurrentInput(email);
    } else {
      setCurrentInput(message);
    }
  }, [step, email, message]);

  useInput(
    (input, key) => {
      if (key.escape || (key.ctrl && input === "c")) {
        onCancel?.();
        exit();
      } else if (key.return) {
        if (key.shift && step === "message") {
          setCurrentInput((prev) => `${prev}\n`);
        } else {
          if (step === "email" && currentInput.trim()) {
            setEmail(currentInput);
            setStep("message");
          } else if (step === "message" && currentInput.trim()) {
            setMessage(currentInput);
            onSubmit(email, currentInput);
            exit();
          }
        }
      } else if (key.backspace || key.delete) {
        setCurrentInput((prev) => prev.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta) {
        setCurrentInput((prev) => prev + input);
      }
    },
    { isActive: true },
  );

  return (
    <Box flexDirection="column" padding={2}>
      <Text bold color="cyan">
        💬 Share your feedback with Open Composer's team
      </Text>

      <Box marginTop={1} marginBottom={1}>
        {step === "email" ? (
          <Box>
            <Text>? Email: </Text>
            <Text>{currentInput || <Text dimColor>your@email.com</Text>}</Text>
            <Text color="gray">_</Text>
          </Box>
        ) : (
          <Box flexDirection="column">
            <Text>
              ? Share your feedback with Open Composer's team (Enter to send,
              Shift+Enter for a newline)
            </Text>
            <Box flexDirection="column">
              {currentInput.split("\n").map((line, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: Bypass feedback line key warning
                <Text key={line + i}>
                  {line ||
                    (i === 0 ? (
                      <Text dimColor>Your feedback here...</Text>
                    ) : (
                      ""
                    ))}
                </Text>
              ))}
              <Text color="gray">_</Text>
            </Box>
          </Box>
        )}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Press Enter to continue, Escape to cancel</Text>
      </Box>
    </Box>
  );
};
