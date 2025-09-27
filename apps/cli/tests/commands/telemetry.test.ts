import { describe, expect, it } from "bun:test";
import { runCli, stripAnsi } from "../utils";

describe("Telemetry Command", () => {
  describe("telemetry enable", () => {
    it("enables telemetry collection", async () => {
      const result = await runCli(["telemetry", "enable"]);
      const stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).toBe(0);
      expect(stderr).toBe("");
      expect(stdout).toContain("Telemetry enabled");
      expect(stdout).toContain(
        "Anonymous usage statistics will now be collected",
      );
    });
  });

  describe("telemetry disable", () => {
    it("disables telemetry collection", async () => {
      const result = await runCli(["telemetry", "disable"]);
      const stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).toBe(0);
      expect(stderr).toBe("");
      expect(stdout).toContain("Telemetry disabled");
      expect(stdout).toContain("Your privacy is protected");
    });
  });

  describe("telemetry status", () => {
    it("shows current telemetry status", async () => {
      const result = await runCli(["telemetry", "status"]);
      const stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).toBe(0);
      expect(stderr).toBe("");
      expect(stdout).toContain("Telemetry is currently:");
      expect(stdout).toMatch(/(enabled|disabled)/);
    });

    it("shows consent information when telemetry is enabled", async () => {
      // First enable telemetry
      await runCli(["telemetry", "enable"]);

      const result = await runCli(["telemetry", "status"]);
      const stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).toBe(0);
      expect(stderr).toBe("");
      expect(stdout).toContain("Consent given:");
      expect(stdout).toContain("What we collect:");
      expect(stdout).toContain("Command usage statistics");
      expect(stdout).toContain("Error reports and crash data");
      expect(stdout).toContain("Performance metrics");
      expect(stdout).toContain("Privacy protection:");
      expect(stdout).toContain("All data is anonymized");
    });

    it("shows enable instructions when telemetry is disabled", async () => {
      // First disable telemetry
      await runCli(["telemetry", "disable"]);

      const result = await runCli(["telemetry", "status"]);
      const stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).toBe(0);
      expect(stderr).toBe("");
      expect(stdout).toContain("To enable telemetry:");
      expect(stdout).toContain("open-composer telemetry enable");
    });
  });

  describe("telemetry reset", () => {
    it("resets telemetry consent", async () => {
      const result = await runCli(["telemetry", "reset"]);
      const stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).toBe(0);
      expect(stderr).toBe("");
      expect(stdout).toContain("Telemetry consent reset");
      expect(stdout).toContain(
        "Next time you run a command, you'll be prompted for consent again",
      );
    });
  });

  describe("telemetry help", () => {
    it("shows help text for telemetry command", async () => {
      const result = await runCli(["telemetry", "--help"]);
      const stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).toBe(0);
      expect(stderr).toBe("");
      expect(stdout).toContain("Manage telemetry and privacy settings");
      expect(stdout).toContain("SUBCOMMANDS");
      expect(stdout).toContain("enable");
      expect(stdout).toContain("disable");
      expect(stdout).toContain("status");
      expect(stdout).toContain("reset");
    });
  });
});
