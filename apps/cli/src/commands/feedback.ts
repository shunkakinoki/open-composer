import { Command } from "@effect/cli";
import { submitFeedback } from "@open-composer/feedback";
import * as Effect from "effect/Effect";
import { render } from "@opentui/react";
import React from "react";
import { FeedbackPrompt } from "../components/FeedbackPrompt.js";
import { trackCommand } from "../services/telemetry-service.js";
import type { CommandBuilder } from "../types/commands.js";

// -----------------------------------------------------------------------------
// Command Builder
// -----------------------------------------------------------------------------

export function buildFeedbackCommand(): CommandBuilder<"feedback"> {
  const command = () =>
    Command.make("feedback").pipe(
      Command.withDescription("Submit feedback to the Open Composer team"),
      Command.withHandler(() =>
        Effect.gen(function* () {
          yield* trackCommand("feedback", "submit");

          yield* Effect.async<void>(async (resume) => {
            const { unmount } = await render(
              React.createElement(FeedbackPrompt, {
                onSubmit: async (email: string, message: string) => {
                  try {
                    const feedback = await submitFeedback(email, message);
                    console.log("✔ Feedback sent.");
                    console.log(`\nID: ${feedback.id}`);
                    console.log("THANK YOU! bun i");
                    unmount();
                    resume(Effect.succeed(undefined));
                  } catch (error) {
                    console.log(
                      "Failed to send feedback:",
                      error instanceof Error ? error.message : String(error),
                    );
                    unmount();
                    resume(Effect.succeed(undefined));
                  }
                },
                onCancel: () => {
                  console.log("Feedback cancelled.");
                  unmount();
                  resume(Effect.succeed(undefined));
                },
              }),
            );
          });
        }),
      ),
    );

  return {
    command,
    metadata: {
      name: "feedback",
      description: "Submit feedback to the Open Composer team",
    },
  };
}
