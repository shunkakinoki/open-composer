import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BunContext } from "@effect/platform-bun";
import * as SqliteDrizzle from "@effect/sql-drizzle/Sqlite";
import { SqliteClient, SqliteMigrator } from "@effect/sql-sqlite-bun";
import { Effect, Layer } from "effect";

const defaultDatabaseFile = path.join(homedir(), ".open-composer", "app.db");
const resolvedDatabaseFile = path.resolve(
  process.env.OPEN_COMPOSER_DB_FILE ?? defaultDatabaseFile,
);

export const databaseDirectory = path.dirname(resolvedDatabaseFile);
export const databaseFile = resolvedDatabaseFile;
export const migrationsDirectory = fileURLToPath(
  new URL("../migrations", import.meta.url),
);

const SqliteClientLive = Layer.unwrapEffect(
  Effect.gen(function* () {
    yield* Effect.tryPromise(() =>
      mkdir(databaseDirectory, { recursive: true }),
    );
    return SqliteClient.layer({
      filename: databaseFile,
    });
  }),
);

const DrizzleLive = SqliteDrizzle.layer.pipe(Layer.provide(SqliteClientLive));

const MigrationsLive = Layer.scopedDiscard(
  SqliteMigrator.run({
    loader: SqliteMigrator.fromFileSystem(migrationsDirectory),
    schemaDirectory: migrationsDirectory,
  }).pipe(Effect.provide(BunContext.layer), Effect.provide(SqliteClientLive)),
);

export const DatabaseLive = Layer.mergeAll(
  SqliteClientLive,
  DrizzleLive,
  MigrationsLive,
);

/**
 * Runs a migration effect with the proper context layers
 */
export const runMigration = <R, E>(migration: Effect.Effect<unknown, E, R>) =>
  migration.pipe(
    Effect.provide(SqliteClientLive),
    Effect.provide(BunContext.layer),
  );

/**
 * Initializes the database by running migrations
 */
export const initializeDatabase = Effect.gen(function* () {
  // Read all migration files from the migrations directory
  const migrationFiles = yield* Effect.promise(async () => {
    const fs = await import("node:fs/promises");
    const entries = await fs.readdir(migrationsDirectory);
    return entries
      .filter((file) => file.endsWith(".ts") || file.endsWith(".js"))
      .sort(); // Sort by filename (should be numbered)
  });

  // Import and run each migration in order
  for (const file of migrationFiles) {
    const migrationPath = `../migrations/${file.replace(".ts", "").replace(".js", "")}`;
    const migration = yield* Effect.promise(() => import(migrationPath));
    yield* migration.default;
  }
});

export { SqliteClientLive, DrizzleLive, MigrationsLive };
export { SqliteDrizzle } from "@effect/sql-drizzle/Sqlite";
export * from "./schema";
