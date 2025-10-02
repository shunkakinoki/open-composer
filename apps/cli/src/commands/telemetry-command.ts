import { Command } from "@effect/cli";
import { Effect } from "effect";
import { ConfigService } from "../services/config-service.js";
import { trackCommand } from "../services/telemetry-service.js";
import type { CommandBuilder } from "../types/commands.js";

// -----------------------------------------------------------------------------
// Command Builder
// -----------------------------------------------------------------------------

export function buildTelemetryCommand(): CommandBuilder<"telemetry"> {
  const command = () =>
    Command.make("telemetry").pipe(
      Command.withDescription("Manage telemetry and privacy settings"),
      Command.withSubcommands([
        buildEnableCommand(),
        buildDisableCommand(),
        buildStatusCommand(),
        buildResetCommand(),
      ]),
    );
  return {
    command,
    metadata: {
      name: "telemetry",
      description: "Manage telemetry and privacy settings",
    },
  };
}

// -----------------------------------------------------------------------------
// Command Implementations
// -----------------------------------------------------------------------------

export function buildEnableCommand() {
  return Command.make("enable").pipe(
    Command.withDescription("Enable telemetry collection"),
    Command.withHandler(() =>
      Effect.gen(function* (_) {
        const configService = yield* _(ConfigService);
        yield* _(configService.setTelemetryConsent(true));
        console.log(
          "✅ Telemetry enabled. Thank you for helping improve Open Composer!",
        );
        console.log("📊 Anonymous usage statistics will now be collected.");
        return undefined;
      }),
    ),
  );
}

export function buildDisableCommand() {
  return Command.make("disable").pipe(
    Command.withDescription("Disable telemetry collection"),
    Command.withHandler(() =>
      Effect.gen(function* (_) {
        const configService = yield* _(ConfigService);
        yield* _(configService.setTelemetryConsent(false));
        console.log("✅ Telemetry disabled. Your privacy is protected.");
        console.log("🔒 No usage statistics will be collected.");
        return undefined;
      }),
    ),
  );
}

export function buildStatusCommand() {
  return Command.make("status").pipe(
    Command.withDescription("Show current telemetry status"),
    Command.withHandler(() =>
      Effect.gen(function* (_) {
        const configService = yield* _(ConfigService);
        const config = yield* _(configService.getConfig());
        const consent = yield* _(configService.getTelemetryConsent());
        const status = consent ? "enabled" : "disabled";
        const statusEmoji = consent ? "📊" : "🔒";

        console.log(`${statusEmoji} Telemetry is currently: ${status}`);

        const telemetry = config.telemetry;
        if (telemetry?.consentedAt) {
          const consentedAt = new Date(telemetry.consentedAt).toLocaleString();
          console.log(`   Consent given: ${consentedAt}`);
        }

        if (consent) {
          console.log("");
          console.log("📋 What we collect:");
          console.log("   • Command usage statistics");
          console.log("   • Error reports and crash data");
          console.log("   • Performance metrics");
          console.log("   • Feature usage patterns");
          console.log("");
          console.log("🔒 Privacy protection:");
          console.log("   • All data is anonymized");
          console.log("   • No personal information is collected");
          console.log("   • You can disable this anytime");
        } else {
          console.log("");
          console.log("💡 To enable telemetry:");
          console.log("   Run: open-composer telemetry enable");
        }

        // Track the telemetry status command
        yield* _(trackCommand("telemetry", "status"));

        return undefined;
      }),
    ),
  );
}

export function buildResetCommand() {
  return Command.make("reset").pipe(
    Command.withDescription("Reset telemetry consent (will prompt again)"),
    Command.withHandler(() =>
      Effect.gen(function* (_) {
        const configService = yield* _(ConfigService);
        yield* _(
          configService.updateConfig({
            // Remove telemetry config to trigger re-prompt by not including it in updates
          }),
        );
        console.log("✅ Telemetry consent reset.");
        console.log(
          "🔄 Next time you run a command, you'll be prompted for consent again.",
        );
        return undefined;
      }),
    ),
  );
}
