import { TextAttributes } from "@opentui/core";

import { useKeyboard } from "@opentui/react"; 
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
  

  useKeyboard(
    (key) => {
      if (key.name === "left" || key.name === "right") {
        setSelected(selected === "yes" ? "no" : "yes");
      } else if (key.name === "return") {
        onConsent(selected === "yes");
        process.exit(0); // Exit the Ink app after handling consent
      } else if (key.name === "escape" || (key.ctrl && key.sequence === "c")) {
        onCancel?.();
        process.exit(0); // Exit the Ink app after handling cancellation
      }
    },
    { isActive: true },
  );

  return (
    <box flexDirection="column" padding={2}>
      <text content="🔒 Open Composer - Privacy Notice" style={{ fg: "cyan", attributes: TextAttributes.BOLD }} />

      <box marginTop={1} marginBottom={1}>
        <text content="Open Composer respects your privacy and is committed to protecting your data." />
      </box>

      <box marginTop={1} marginBottom={1}>
        <text content="📊 Telemetry Collection (Optional)" style={{ attributes: TextAttributes.BOLD }} />
      </box>

      <box marginTop={1} marginBottom={1}>
        <text content="We can collect anonymous usage statistics to help improve Open Composer." />
      </box>

      <box marginTop={1} marginBottom={1}>
        <text content="This includes command usage, error reports, and performance metrics." />
      </box>

      <box marginTop={1} marginBottom={1}>
        <text content="All data is anonymized and cannot be used to identify you." />
      </box>

      <box marginTop={1} marginBottom={1}>
        <text content="You can change this setting anytime with: open-composer telemetry disable" />
      </box>

      <box marginTop={2}>
        <text content="Enable telemetry collection?" />
      </box>

      <box marginTop={1}>
        <text content="Use arrow keys to select, Enter to confirm, Esc to skip" style={{ fg: "gray" }} />
      </box>

      <box marginTop={2}>
        <box marginRight={2} key="yes-option">
          <text
            content={`${selected === "yes" ? "●" : "○"} Yes, enable telemetry`}
            style={{ fg: selected === "yes" ? "green" : "gray" }}
          />
        </box>
        <box key="no-option">
          <text
            content={`${selected === "no" ? "●" : "○"} No, keep disabled`}
            style={{ fg: selected === "no" ? "red" : "gray" }}
          />
        </box>
      </box>
    </box>
  );
};
