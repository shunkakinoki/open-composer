import { Command, Options } from "@effect/cli";
import {
  type OrchestratorError,
  type ProjectRequirements,
  planProject,
  type TaskPlan,
} from "@open-composer/orchestrator";
import * as Effect from "effect/Effect";
import { render } from "ink";
import React from "react";
import {
  type OrchestratorPlanConfig,
  OrchestratorPlanPrompt,
} from "../components/OrchestratorPlanPrompt.js";
import {
  trackCommand,
  trackFeatureUsage,
} from "../services/telemetry-service.js";
import type { CommandBuilder } from "../types/commands.js";

// -----------------------------------------------------------------------------
// Command Builder
// -----------------------------------------------------------------------------

export function buildOrchestratorCommand(): CommandBuilder<"orchestrator"> {
  const command = () =>
    Command.make("orchestrator").pipe(
      Command.withDescription("AI-powered project orchestration and planning"),
      Command.withSubcommands([buildPlanCommand()]),
    );

  return {
    command,
    metadata: {
      name: "orchestrator",
      description: "AI-powered project orchestration and planning",
    },
  };
}

// -----------------------------------------------------------------------------
// Command Implementations
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

function displayPlan(result: TaskPlan): void {
  console.log("✨ Project Plan Generated\n");
  console.log("─".repeat(60));
  console.log(`\n📋 Tasks (${result.tasks.length} total):\n`);

  for (const task of result.tasks) {
    console.log(`\n• ${task.id}: ${task.title}`);
    console.log(`  Description: ${task.description}`);
    console.log(`  Priority: ${task.priority}`);
    if (task.estimatedEffort) {
      console.log(`  Effort: ${task.estimatedEffort} hours`);
    }
    if (task.dependencies && task.dependencies.length > 0) {
      console.log(`  Depends on: ${task.dependencies.join(", ")}`);
    }
  }

  if (result.phases && result.phases.length > 0) {
    console.log("\n\n📊 Phases:\n");
    for (const phase of result.phases) {
      console.log(`\n• ${phase.name}`);
      console.log(`  Tasks: ${phase.taskIds.join(", ")}`);
    }
  }

  if (result.totalEffort) {
    console.log(`\n\n⏱️  Total Estimated Effort: ${result.totalEffort} hours`);
  }

  console.log("\n─".repeat(60));
}

async function runInteractivePlan(): Promise<OrchestratorPlanConfig> {
  return new Promise((resolve, reject) => {
    render(
      React.createElement(OrchestratorPlanPrompt, {
        onComplete: (config: OrchestratorPlanConfig) => {
          resolve(config);
        },
        onCancel: () => {
          reject(new Error("User cancelled the operation"));
        },
      }),
    );
  });
}

function buildPlanCommand() {
  const objectiveArg = Options.text("objective").pipe(
    Options.optional,
    Options.withDescription("Project objective or goal"),
  );

  const descriptionArg = Options.text("description").pipe(
    Options.optional,
    Options.withDescription("Detailed project description"),
  );

  const constraintsOption = Options.text("constraints").pipe(
    Options.optional,
    Options.withDescription(
      "Comma-separated constraints (e.g., 'TypeScript,React')",
    ),
  );

  const techRequirementsOption = Options.text("tech-requirements").pipe(
    Options.optional,
    Options.withDescription(
      "Comma-separated technical requirements (e.g., 'PostgreSQL,REST API')",
    ),
  );

  return Command.make("plan", {
    objective: objectiveArg,
    description: descriptionArg,
    constraints: constraintsOption,
    techRequirements: techRequirementsOption,
  }).pipe(
    Command.withDescription("Generate a project plan using AI orchestration"),
    Command.withHandler((config) =>
      Effect.gen(function* () {
        yield* trackCommand("orchestrator", "plan");

        // Check if we should run interactive mode
        const isInteractive =
          config.objective._tag === "None" &&
          config.description._tag === "None";

        let requirements: ProjectRequirements;

        if (isInteractive) {
          // Launch TUI for interactive input
          const tuiConfig = yield* Effect.tryPromise({
            try: () => runInteractivePlan(),
            catch: (error) =>
              new Error(
                `Failed to run interactive plan: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              ),
          });

          requirements = {
            objective: tuiConfig.objective,
            description: tuiConfig.description,
            constraints: tuiConfig.constraints,
            technicalRequirements: tuiConfig.technicalRequirements,
          };
        } else {
          // Use CLI arguments
          if (
            config.objective._tag === "None" ||
            config.description._tag === "None"
          ) {
            console.error(
              "❌ Error: --objective and --description are required when not using interactive mode",
            );
            return undefined;
          }

          requirements = {
            objective: config.objective.value,
            description: config.description.value,
            constraints:
              config.constraints._tag === "Some"
                ? config.constraints.value.split(",").map((s) => s.trim())
                : undefined,
            technicalRequirements:
              config.techRequirements._tag === "Some"
                ? config.techRequirements.value.split(",").map((s) => s.trim())
                : undefined,
          };
        }

        yield* trackFeatureUsage("orchestrator_plan", {
          has_constraints: !!requirements.constraints,
          has_tech_requirements: !!requirements.technicalRequirements,
          is_interactive: isInteractive,
        });

        console.log("🤖 Professor Oak is analyzing your project...\n");

        // Call orchestrator service
        const result = yield* planProject(requirements);

        // Display the plan
        displayPlan(result);

        return undefined;
      }).pipe(
        Effect.catchAll((error: OrchestratorError | Error) =>
          Effect.sync(() => {
            console.error("\n❌ Orchestration failed:");
            if (error instanceof Error) {
              console.error(`   ${error.message}`);
            } else {
              console.error(`   ${error.message}`);
              if (error._tag === "OrchestratorAPIError") {
                console.error(`   Model: ${error.modelName}`);
                console.error(`   Task: ${error.task}`);
              }
            }
            return undefined;
          }),
        ),
      ),
    ),
  );
}
