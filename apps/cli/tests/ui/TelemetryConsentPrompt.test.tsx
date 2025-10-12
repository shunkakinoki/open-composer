import { describe, expect, mock, test } from "bun:test";

import { TelemetryConsentPrompt } from "../../src/components/TelemetryConsentPrompt.js";
import { render } from "../utils.js";

describe("TelemetryConsentPrompt", () => {
  test("renders correctly", async () => {
    const mockOnConsent = mock(() => {});
    const mockOnCancel = mock(() => {});

    const { lastFrame, cleanup } = await render(
      <TelemetryConsentPrompt
        onConsent={mockOnConsent}
        onCancel={mockOnCancel}
      />,
    );
    expect(lastFrame()).toMatchSnapshot();
    cleanup();
  });
});
