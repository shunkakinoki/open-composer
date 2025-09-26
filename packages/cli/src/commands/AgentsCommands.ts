/** biome-ignore-all lint/complexity/noThisInStatic: Exclude for Commands */
import { Args, Command, Options } from "@effect/cli";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import { AgentCli } from "../services/AgentCli.js";

// biome-ignore lint/complexity/noStaticOnlyClass: Exclude for Commands
export class AgentsCommands {
  static build() {
    return Command.make("agents").pipe(
      Command.withDescription("Manage AI agents"),
      Command.withSubcommands([
        this.buildList(),
        this.buildActivate(),
        this.buildDeactivate(),
        this.buildRoute(),
      ]),
    );
  }

  private static withCli<A>(
    f: (cli: AgentCli) => Effect.Effect<A>,
  ): Effect.Effect<A> {
    return Effect.flatMap(AgentCli.make(), f);
  }

  private static buildList() {
    const activeOnlyOption = Options.boolean("active").pipe(
      Options.withDescription("Only show active agents"),
    );

    return Command.make("list", { activeOnly: activeOnlyOption }).pipe(
      Command.withDescription("List available agents"),
      Command.withHandler((config) =>
        this.withCli((cli) => cli.list({ activeOnly: config.activeOnly })),
      ),
    );
  }

  private static buildActivate() {
    const agentArg = Args.text({ name: "agent" }).pipe(
      Args.withDescription("Agent name to activate"),
    );

    return Command.make("activate", { agent: agentArg }).pipe(
      Command.withDescription("Activate an agent"),
      Command.withHandler((config) =>
        this.withCli((cli) => cli.activate(config.agent)),
      ),
    );
  }

  private static buildDeactivate() {
    const agentArg = Args.text({ name: "agent" }).pipe(
      Args.withDescription("Agent name to deactivate"),
    );

    return Command.make("deactivate", { agent: agentArg }).pipe(
      Command.withDescription("Deactivate an agent"),
      Command.withHandler((config) =>
        this.withCli((cli) => cli.deactivate(config.agent)),
      ),
    );
  }

  private static buildRoute() {
    const queryArg = Args.text({ name: "query" }).pipe(
      Args.withDescription("The request to send to the router"),
    );

    const cliPathOption = Options.text("path").pipe(
      Options.optional,
      Options.withDescription("Comma-separated CLI path segments"),
    );

    const agentOption = Options.text("agent").pipe(
      Options.optional,
      Options.withDescription("Explicit agent to route to"),
    );

    return Command.make("route", {
      query: queryArg,
      path: cliPathOption,
      agent: agentOption,
    }).pipe(
      Command.withDescription("Route a query through the agent router"),
      Command.withHandler((config) =>
        this.withCli((cli) =>
          cli.route({
            query: config.query,
            cliPath: Option.getOrUndefined(
              Option.map(config.path, (path) =>
                path.split(",").map((part: string) => part.trim()),
              ),
            ),
            agent: Option.getOrUndefined(config.agent),
          }),
        ),
      ),
    );
  }
}
