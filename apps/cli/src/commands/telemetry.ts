import { Command } from "@effect/cli";
import { Effect } from "effect";
import { ConfigService } from "../services/config.js";

export function buildTelemetryCommand() {
  return Command.make("telemetry").pipe(
    Command.withDescription("Manage telemetry and privacy settings"),
    Command.withSubcommands([
      Command.make("enable").pipe(
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
      ),

      Command.make("disable").pipe(
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
      ),

      Command.make("status").pipe(
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
              const consentedAt = new Date(
                telemetry.consentedAt,
              ).toLocaleString();
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

            return undefined;
          }),
        ),
      ),

      Command.make("reset").pipe(
        Command.withDescription("Reset telemetry consent (will prompt again)"),
        Command.withHandler(() =>
          Effect.gen(function* (_) {
            const configService = yield* _(ConfigService);
            yield* _(
              configService.updateConfig({
                telemetry: undefined, // Remove telemetry config to trigger re-prompt
              }),
            );
            console.log("✅ Telemetry consent reset.");
            console.log(
              "🔄 Next time you run a command, you'll be prompted for consent again.",
            );
            return undefined;
          }),
        ),
      ),
    ]),
  );
}
