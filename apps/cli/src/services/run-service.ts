import { type Session, SqliteDrizzle, sessions } from "@open-composer/db";
import { desc, eq } from "drizzle-orm";
import * as Console from "effect/Console";
import * as Effect from "effect/Effect";
import { StackService } from "./stack-service.js";

const printLines = (lines: ReadonlyArray<string>) =>
  Effect.forEach(lines, (line) => Console.log(line), { discard: true });

export class RunService {
  /**
   * Create a new session with provided parameters (for React component integration)
   */
  createInteractive(
    sessionName: string,
    workspaceChoice: "existing" | "create" | "none",
    workspacePath?: string,
  ): Effect.Effect<number, Error, SqliteDrizzle> {
    return Effect.gen(function* () {
      // biome-ignore lint/suspicious/noExplicitAny: Drizzle type incompatibility with exactOptionalPropertyTypes
      const db = yield* SqliteDrizzle as any;

      let finalWorkspacePath: string | undefined;

      if (workspaceChoice === "existing" || workspaceChoice === "create") {
        if (!workspacePath) {
          throw new Error(
            "Workspace path is required for existing or create options",
          );
        }
        finalWorkspacePath = workspacePath;

        // For existing workspace, validate it exists and is a git repo
        if (workspaceChoice === "existing") {
          yield* Effect.tryPromise({
            try: async () => {
              const fs = await import("node:fs/promises");
              const path = await import("node:path");

              await fs.access(finalWorkspacePath as string);
              const gitPath = path.join(finalWorkspacePath as string, ".git");
              await fs.access(gitPath);
            },
            catch: () => {
              throw new Error(
                `"${finalWorkspacePath}" is not a valid git repository`,
              );
            },
          });
        }
      }

      // Create the session in database
      const result = yield* db
        // biome-ignore lint/suspicious/noExplicitAny: Drizzle type incompatibility with exactOptionalPropertyTypes
        .insert(sessions as any)
        .values({
          name: sessionName,
          workspacePath: finalWorkspacePath,
          description: `Session created on ${new Date().toLocaleDateString()}`,
          status: "active",
        })
        .returning();
      // biome-ignore lint/suspicious/noExplicitAny: Drizzle type incompatibility
      const newSession = (result as any)[0] as Session;

      // Automatically create a stack branch for this session if we have a workspace
      if (finalWorkspacePath && newSession) {
        yield* RunService.createStackForSession(newSession);
      }

      return newSession?.id ?? 0;
    }) as Effect.Effect<number, Error, SqliteDrizzle>;
  }

  /**
   * Create a new session with interactive prompts
   */
  create(name?: string): Effect.Effect<void, Error, SqliteDrizzle> {
    return Effect.gen(function* () {
      // biome-ignore lint/suspicious/noExplicitAny: Drizzle type incompatibility with exactOptionalPropertyTypes
      const db = yield* SqliteDrizzle as any;

      // If no name provided, prompt for it
      let sessionName = name;
      if (!sessionName) {
        sessionName = yield* Effect.tryPromise({
          try: async () => {
            const readline = await import("node:readline");

            return new Promise<string>((resolve) => {
              const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
              });

              rl.question("Enter session name: ", (nameInput) => {
                rl.close();
                resolve(nameInput.trim() || `Session ${Date.now()}`);
              });
            });
          },
          catch: (error) =>
            new Error(`Failed to prompt for session name: ${error}`),
        });
      }

      // Prompt for workspace choice
      const workspaceChoice = yield* Effect.tryPromise({
        try: async () => {
          const readline = await import("node:readline");

          return new Promise<"existing" | "create" | "none">((resolve) => {
            const rl = readline.createInterface({
              input: process.stdin,
              output: process.stdout,
            });

            console.log("\nChoose workspace option:");
            console.log("1. Use existing git workspace");
            console.log("2. Create new workspace");
            console.log("3. No workspace (just session tracking)");

            rl.question("Enter choice (1-3): ", (choice) => {
              rl.close();
              switch (choice.trim()) {
                case "1":
                  resolve("existing");
                  break;
                case "2":
                  resolve("create");
                  break;
                default:
                  resolve("none");
              }
            });
          });
        },
        catch: (error) =>
          new Error(`Failed to prompt for workspace choice: ${error}`),
      });

      let workspacePath: string | undefined;

      if (workspaceChoice === "existing") {
        workspacePath = yield* Effect.tryPromise({
          try: async () => {
            const readline = await import("node:readline");
            const path = await import("node:path");
            const fs = await import("node:fs/promises");

            return new Promise<string>((resolve) => {
              const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
              });

              const promptPath = () => {
                rl.question(
                  "Enter path to existing git workspace: ",
                  async (inputPath) => {
                    const resolvedPath = path.resolve(inputPath.trim());

                    try {
                      // Check if path exists and is a git repository
                      await fs.access(resolvedPath);
                      const gitPath = path.join(resolvedPath, ".git");
                      await fs.access(gitPath);

                      rl.close();
                      resolve(resolvedPath);
                    } catch {
                      console.log(
                        `❌ "${resolvedPath}" is not a valid git repository.`,
                      );
                      promptPath();
                    }
                  },
                );
              };

              promptPath();
            });
          },
          catch: (error) =>
            new Error(`Failed to prompt for workspace path: ${error}`),
        });
      } else if (workspaceChoice === "create") {
        // For now, we'll create a placeholder - could integrate with git worktree creation
        workspacePath = yield* Effect.tryPromise({
          try: async () => {
            const readline = await import("node:readline");
            const path = await import("node:path");

            return new Promise<string>((resolve) => {
              const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
              });

              rl.question("Enter path for new workspace: ", (inputPath) => {
                rl.close();
                resolve(path.resolve(inputPath.trim()));
              });
            });
          },
          catch: (error) =>
            new Error(`Failed to prompt for new workspace path: ${error}`),
        });
      }

      // Create the session in database
      const result = (yield* db
        // biome-ignore lint/suspicious/noExplicitAny: Drizzle type incompatibility
        .insert(sessions as any)
        .values({
          name: sessionName,
          workspacePath,
          description: `Session created on ${new Date().toLocaleDateString()}`,
          status: "active",
        })
        .returning()) as Session[] | undefined;

      const newSession = result && result.length > 0 ? result[0] : null;
      if (!newSession) {
        throw new Error("Failed to create session");
      }

      // Automatically create a stack branch for this session if we have a workspace
      if (workspacePath) {
        yield* RunService.createStackForSession(newSession);
      }

      yield* printLines([
        `✅ Created session "${newSession.name}"`,
        workspacePath
          ? `📁 Workspace: ${workspacePath}`
          : "📁 No workspace assigned",
        `🆔 ID: ${newSession.id}`,
      ]);
    }) as Effect.Effect<void, Error, SqliteDrizzle>;
  }

  /**
   * List all sessions
   */
  list(): Effect.Effect<void, Error, SqliteDrizzle> {
    return Effect.gen(function* () {
      // biome-ignore lint/suspicious/noExplicitAny: Drizzle type incompatibility with exactOptionalPropertyTypes
      const db = yield* SqliteDrizzle as any;

      const allSessions = (yield* db
        .select()
        // biome-ignore lint/suspicious/noExplicitAny: Drizzle type incompatibility
        .from(sessions as any)
        // biome-ignore lint/suspicious/noExplicitAny: Drizzle type incompatibility
        .orderBy(desc((sessions as any).createdAt))) as Session[] | undefined;

      if (!allSessions || allSessions.length === 0) {
        yield* printLines([
          "No sessions found. Create one with: open-composer spawn",
        ]);
        return;
      }

      yield* printLines(["📋 Sessions:"]);
      yield* printLines([""]);

      for (const session of allSessions) {
        const statusIcon =
          session.status === "active"
            ? "🟢"
            : session.status === "completed"
              ? "✅"
              : "📦";
        const workspaceInfo = session.workspacePath
          ? ` 📁 ${session.workspacePath}`
          : "";

        yield* printLines([
          `${statusIcon} ${session.name} (ID: ${session.id})${workspaceInfo}`,
          `   Created: ${new Date(session.createdAt).toLocaleDateString()}`,
          session.description ? `   ${session.description}` : "",
          "",
        ]);
      }
    }) as Effect.Effect<void, Error, SqliteDrizzle>;
  }

  /**
   * Switch to a session (set as active)
   */
  switch(sessionId: number): Effect.Effect<void, Error, SqliteDrizzle> {
    return Effect.gen(function* () {
      // biome-ignore lint/suspicious/noExplicitAny: Drizzle type incompatibility with exactOptionalPropertyTypes
      const db = yield* SqliteDrizzle as any;

      // First, set all sessions to inactive
      yield* db
        // biome-ignore lint/suspicious/noExplicitAny: Drizzle type incompatibility
        .update(sessions as any)
        .set({ status: "inactive", updatedAt: new Date().toISOString() })
        // biome-ignore lint/suspicious/noExplicitAny: Drizzle type incompatibility
        .where(eq((sessions as any).status, "active"));

      // Then set the target session as active
      const result = (yield* db
        // biome-ignore lint/suspicious/noExplicitAny: Drizzle type incompatibility
        .update(sessions as any)
        .set({ status: "active", updatedAt: new Date().toISOString() })
        // biome-ignore lint/suspicious/noExplicitAny: Drizzle type incompatibility
        .where(eq((sessions as any).id, sessionId))
        .returning()) as Session[] | undefined;

      if (!result || result.length === 0) {
        yield* printLines([`❌ Session with ID ${sessionId} not found`]);
        return;
      }

      const session = result[0];
      yield* printLines([
        `🔄 Switched to session "${session.name}"`,
        session.workspacePath ? `📁 Workspace: ${session.workspacePath}` : "",
      ]);
    }) as Effect.Effect<void, Error, SqliteDrizzle>;
  }

  /**
   * Archive a session
   */
  archive(sessionId: number): Effect.Effect<void, Error, SqliteDrizzle> {
    return Effect.gen(function* () {
      // biome-ignore lint/suspicious/noExplicitAny: Drizzle type incompatibility with exactOptionalPropertyTypes
      const db = yield* SqliteDrizzle as any;

      const result = (yield* db
        // biome-ignore lint/suspicious/noExplicitAny: Drizzle type incompatibility
        .update(sessions as any)
        .set({ status: "archived", updatedAt: new Date().toISOString() })
        // biome-ignore lint/suspicious/noExplicitAny: Drizzle type incompatibility
        .where(eq((sessions as any).id, sessionId))
        .returning()) as Session[] | undefined;

      if (!result || result.length === 0) {
        yield* printLines([`❌ Session with ID ${sessionId} not found`]);
        return;
      }

      yield* printLines([`📦 Archived session "${result[0].name}"`]);
    }) as Effect.Effect<void, Error, SqliteDrizzle>;
  }

  /**
   * Delete a session
   */
  delete(sessionId: number): Effect.Effect<void, Error, SqliteDrizzle> {
    return Effect.gen(function* () {
      // biome-ignore lint/suspicious/noExplicitAny: Drizzle type incompatibility with exactOptionalPropertyTypes
      const db = yield* SqliteDrizzle as any;

      const result = (yield* db
        // biome-ignore lint/suspicious/noExplicitAny: Drizzle type incompatibility
        .delete(sessions as any)
        // biome-ignore lint/suspicious/noExplicitAny: Drizzle type incompatibility
        .where(eq((sessions as any).id, sessionId))
        .returning()) as Session[] | undefined;

      if (!result || result.length === 0) {
        yield* printLines([`❌ Session with ID ${sessionId} not found`]);
        return;
      }

      yield* printLines([`🗑️  Deleted session "${result[0].name}"`]);
    }) as Effect.Effect<void, Error, SqliteDrizzle>;
  }

  /**
   * Static helper method to create a stack branch for the session
   */
  private static createStackForSession(session: Session): Effect.Effect<void> {
    return Effect.gen(function* () {
      if (!session.workspacePath) return;

      // Change to the workspace directory and create a stack branch
      const stackCli = new StackService();
      const branchName = `session-${session.id}-${session.name.toLowerCase().replace(/\s+/g, "-")}`;

      // Note: This assumes we're in the correct directory context
      // In a real implementation, you'd want to handle directory changes properly
      yield* stackCli.create(branchName);

      yield* printLines([
        `🌿 Created stack branch "${branchName}" for session`,
      ]);
    });
  }
}
