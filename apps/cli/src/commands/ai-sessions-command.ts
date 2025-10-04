import { Command, Options } from "@effect/cli";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import {
  trackCommand,
  trackFeatureUsage,
} from "../services/telemetry-service.js";
import type { CommandBuilder } from "../types/commands.js";

// -----------------------------------------------------------------------------
// Command Builder
// -----------------------------------------------------------------------------

export const buildAISessionsCommand = (): CommandBuilder<"ai-sessions"> => ({
  command: () =>
    Command.make("ai-sessions").pipe(
      Command.withDescription(
        "View all AI agent sessions (Codex, Cursor, Claude Code)",
      ),
      Command.withSubcommands([buildListCommand()]),
    ),
  metadata: {
    name: "ai-sessions",
    description: "View all AI agent sessions",
  },
});

// -----------------------------------------------------------------------------
// Command Implementations
// -----------------------------------------------------------------------------

function buildListCommand() {
  const agentOption = Options.text("agent").pipe(
    Options.optional,
    Options.withDescription(
      "Filter by agent type (codex, cursor-agent, claude-code)",
    ),
  );

  const limitOption = Options.integer("limit").pipe(
    Options.optional,
    Options.withDefault(50),
    Options.withDescription(
      "Maximum number of sessions to display (default: 50)",
    ),
  );

  return Command.make("list", { agent: agentOption, limit: limitOption }).pipe(
    Command.withDescription("List all AI agent sessions from all sources"),
    Command.withHandler(({ agent, limit }) =>
      Effect.gen(function* () {
        yield* trackCommand("ai-sessions", "list");
        yield* trackFeatureUsage("ai_sessions_list");

        const { AISessionsService } = yield* Effect.promise(
          () => import("@open-composer/ai-sessions"),
        );

        const service = new AISessionsService();
        let sessions = yield* service.getAllSessions();

        // Apply agent filter if provided
        const agentFilter = Option.getOrNull(agent);
        if (agentFilter) {
          sessions = sessions.filter((s) => s.agent === agentFilter);
        }

        if (sessions.length === 0) {
          console.log("No AI sessions found.");
          return;
        }

        // Get limit value
        const limitValue = Option.getOrElse(limit, () => 50);

        // Print header
        console.log("\n🤖 AI Agent Sessions\n");
        if (agentFilter) {
          console.log(`Filter: ${agentFilter}\n`);
        }
        console.log(
          `${"Agent".padEnd(20)} ${"Status".padEnd(12)} ${"Time".padEnd(15)} ${"Repository/Path".padEnd(50)}`,
        );
        console.log("-".repeat(100));

        // Print sessions
        const displaySessions = sessions.slice(0, limitValue);
        for (const session of displaySessions) {
          const agentStr = session.agent.padEnd(20);
          const statusStr =
            `${getStatusIcon(session.status)} ${session.status}`.padEnd(12);
          const timeStr = formatTimestamp(session.timestamp).padEnd(15);
          const repoStr = (session.repository || session.cwd || "-")
            .slice(-50)
            .padEnd(50);
          console.log(`${agentStr} ${statusStr} ${timeStr} ${repoStr}`);
        }

        console.log(
          `\nTotal: ${sessions.length} sessions${limitValue < sessions.length ? ` (showing ${limitValue})` : ""}`,
        );
      }),
    ),
  );
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

function getStatusIcon(status: string): string {
  switch (status) {
    case "active":
      return "●";
    case "completed":
      return "✓";
    case "failed":
      return "✗";
    default:
      return "○";
  }
}
