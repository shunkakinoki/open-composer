import { Box, Text, useApp, useInput } from "ink";
import type React from "react";
import { useState } from "react";

interface TelemetryConsentPromptProps {
  onConsent: (consent: boolean) => void;
  onCancel?: () => void;
}

export const TelemetryConsentPrompt: React.FC<TelemetryConsentPromptProps> = ({
  onConsent,
  onCancel,
}) => {
  const [selected, setSelected] = useState<"yes" | "no">("yes");
  const { exit } = useApp();

  useInput(
    (input, key) => {
      if (key.leftArrow || key.rightArrow) {
        setSelected(selected === "yes" ? "no" : "yes");
      } else if (key.return) {
        onConsent(selected === "yes");
        exit(); // Exit the Ink app after handling consent
      } else if (key.escape || (key.ctrl && input === "c")) {
        onCancel?.();
        exit(); // Exit the Ink app after handling cancellation
      }
    },
    { isActive: true },
  );

  return (
    <Box flexDirection="column" padding={2}>
      <Text bold color="cyan">
        🔒 Open Composer - Privacy Notice
      </Text>

      <Box marginTop={1} marginBottom={1}>
        <Text>
          Open Composer respects your privacy and is committed to protecting
          your data.
        </Text>
      </Box>

      <Box marginTop={1} marginBottom={1}>
        <Text bold>📊 Telemetry Collection (Optional)</Text>
      </Box>

      <Box marginTop={1} marginBottom={1}>
        <Text>
          We can collect anonymous usage statistics to help improve Open
          Composer.
        </Text>
      </Box>

      <Box marginTop={1} marginBottom={1}>
        <Text>
          This includes command usage, error reports, and performance metrics.
        </Text>
      </Box>

      <Box marginTop={1} marginBottom={1}>
        <Text>All data is anonymized and cannot be used to identify you.</Text>
      </Box>

      <Box marginTop={1} marginBottom={1}>
        <Text>
          You can change this setting anytime with: open-composer telemetry
          disable
        </Text>
      </Box>

      <Box marginTop={2}>
        <Text>Enable telemetry collection?</Text>
      </Box>

      <Box marginTop={1}>
        <Text color="gray">
          Use arrow keys to select, Enter to confirm, Esc to skip
        </Text>
      </Box>

      <Box marginTop={2}>
        <Box marginRight={2} key="yes-option">
          <Text color={selected === "yes" ? "green" : "gray"}>
            {selected === "yes" ? "●" : "○"} Yes, enable telemetry
          </Text>
        </Box>
        <Box key="no-option">
          <Text color={selected === "no" ? "red" : "gray"}>
            {selected === "no" ? "●" : "○"} No, keep disabled
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
