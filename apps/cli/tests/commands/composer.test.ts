import { describe, expect, it } from "bun:test";
import { runCli, stripAnsi } from "../utils";

describe("Composer Root Command", () => {
  it("shows root help with all subcommands", async () => {
    const result = await runCli(["--help"]);
    const stdout = stripAnsi(result.stdout);
    const stderr = stripAnsi(result.stderr);

    expect(result.code).toBe(0);
    expect(stderr).toBe("");
    expect(stdout).toContain("Open Composer command line interface");
    expect(stdout).toContain("SUBCOMMANDS");
    expect(stdout).toContain("tui");
    expect(stdout).toContain("gw");
    expect(stdout).toContain("agents");
    expect(stdout).toContain("stack");
    expect(stdout).toContain("telemetry");
  });

  it("shows version information", async () => {
    const result = await runCli(["--version"]);
    const stdout = stripAnsi(result.stdout);
    const stderr = stripAnsi(result.stderr);

    expect(result.code).toBe(0);
    expect(stderr).toBe("");
    expect(stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  it("handles unknown subcommand gracefully", async () => {
    const result = await runCli(["unknown-command"]);
    const _stdout = stripAnsi(result.stdout);
    const stderr = stripAnsi(result.stderr);

    expect(result.code).not.toBe(0);
    expect(stderr).toContain("Unknown command");
  });

  it("validates subcommand structure", async () => {
    // Test that all expected subcommands are available
    const subcommands = ["tui", "gw", "agents", "stack", "telemetry"];

    for (const subcommand of subcommands) {
      const result = await runCli([subcommand, "--help"]);
      const stdout = stripAnsi(result.stdout);
      const stderr = stripAnsi(result.stderr);

      expect(result.code).toBe(0);
      expect(stderr).toBe("");
      expect(stdout).toContain(`open-composer ${subcommand}`);
    }
  });
});
