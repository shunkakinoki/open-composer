import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BunContext } from "@effect/platform-bun";
import { SqlClient } from "@effect/sql";
import * as SqliteDrizzle from "@effect/sql-drizzle/Sqlite";
import { SqliteClient } from "@effect/sql-sqlite-bun";
import { Effect, Layer } from "effect";
import * as schema from "./schema.js";

const getDatabaseFile = () => {
  const defaultDatabaseFile = path.join(homedir(), ".open-composer", "app.db");
  return path.resolve(process.env.OPEN_COMPOSER_DB_FILE ?? defaultDatabaseFile);
};

// Export as getters so they're evaluated at access time
export const databaseFile = {
  get value() {
    return getDatabaseFile();
  },
};

export const databaseDirectory = {
  get value() {
    return path.dirname(getDatabaseFile());
  },
};
export const migrationsDirectory = fileURLToPath(
  new URL("../migrations", import.meta.url),
);

const SqliteClientLive = Layer.unwrapEffect(
  Effect.gen(function* () {
    yield* Effect.tryPromise(() =>
      mkdir(databaseDirectory.value, { recursive: true }),
    );
    return SqliteClient.layer({
      filename: databaseFile.value,
    });
  }),
);

/**
 * Initializes the database by running migrations
 */
export const initializeDatabase = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  // Create migrations table if it doesn't exist
  yield* sql`
    CREATE TABLE IF NOT EXISTS effect_sql_migrations (
      migration_id INTEGER PRIMARY KEY NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      name VARCHAR(255) NOT NULL
    )
  `;

  // Read all migration files from the migrations directory
  const migrationFiles = yield* Effect.promise(async () => {
    const fs = await import("node:fs/promises");
    const entries = await fs.readdir(migrationsDirectory);
    return entries
      .filter(
        (file) =>
          (file.endsWith(".ts") || file.endsWith(".js")) &&
          !file.startsWith("_"),
      )
      .sort(); // Sort by filename (should be numbered)
  });

  // Import and run each migration in order, tracking them
  for (const file of migrationFiles) {
    const migrationId = parseInt(file.split("_")[0], 10); // Extract ID from filename like "0000_create_settings.ts"
    const migrationName = file.replace(".ts", "");

    // Check if migration already ran
    const existing = yield* sql`
      SELECT migration_id FROM effect_sql_migrations WHERE migration_id = ${migrationId}
    `;

    if (existing.length === 0) {
      // Run the migration
      const migrationPath = `../migrations/${file.replace(".ts", "")}`;
      const migration = yield* Effect.promise(() => import(migrationPath));
      yield* migration.default;

      // Record the migration
      yield* sql`
        INSERT INTO effect_sql_migrations (migration_id, name, created_at)
        VALUES (${migrationId}, ${migrationName}, ${new Date().toISOString()})
      `;
    }
  }
});

const DrizzleLive = SqliteDrizzle.layer.pipe(Layer.provide(SqliteClientLive));

const MigrationsLive = Layer.effectDiscard(initializeDatabase).pipe(
  Layer.provide(SqliteClientLive),
);

export const DatabaseLive = Layer.mergeAll(SqliteClientLive, DrizzleLive);

// Layer that includes migrations for testing migration functionality
export const DatabaseWithMigrationsLive = Layer.mergeAll(
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
 * Creates a snapshot of the current database schema and data
 */
export const createDatabaseSnapshot = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  // Get all table schemas
  const tablesResult = yield* sql`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `;

  const tables = tablesResult.map((row) => (row as { name: string }).name);
  const snapshot: Record<string, unknown[]> = {};

  // Export data from each table (simplified for now)
  // TODO: Implement full table data export
  for (const table of tables) {
    snapshot[table] = [];
  }

  return {
    timestamp: new Date().toISOString(),
    schema: {
      version: "1.0",
      tables: tables,
    },
    data: snapshot,
  };
});

/**
 * Creates a snapshot of settings only
 */
export const createSettingsSnapshot = Effect.gen(function* () {
  const db = yield* SqliteDrizzle.SqliteDrizzle;
  const settings = yield* db
    .select()
    .from(schema.settings)
    .orderBy(schema.settings.key);

  return {
    timestamp: new Date().toISOString(),
    settings: settings.map((setting: schema.Setting) => ({
      key: setting.key,
      value: setting.value,
      updatedAt: setting.updatedAt,
    })),
  };
});

/**
 * Restores settings from a snapshot
 */
export const restoreSettingsSnapshot = (snapshot: {
  settings: Array<{ key: string; value: string; updatedAt: string }>;
}) =>
  Effect.gen(function* () {
    const db = yield* SqliteDrizzle.SqliteDrizzle;

    // Clear existing settings
    yield* db.delete(schema.settings);

    // Insert snapshot settings
    if (snapshot.settings.length > 0) {
      yield* db.insert(schema.settings).values(
        snapshot.settings.map((setting) => ({
          key: setting.key,
          value: setting.value,
          updatedAt: setting.updatedAt,
        })),
      );
    }
  });

/**
 * Gets the current migration version/status
 */
export const getMigrationStatus = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  // Check if migrations table exists
  const migrationsTableExists = yield* sql`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name='effect_sql_migrations'
  `;

  if (migrationsTableExists.length === 0) {
    return { initialized: false, migrations: [] };
  }

  // Get migration history
  const migrations = yield* sql`
    SELECT migration_id, name, created_at
    FROM effect_sql_migrations
    ORDER BY created_at
  `;

  return {
    initialized: true,
    migrations: migrations.map((m) => ({
      id: (m as { migration_id: string }).migration_id,
      name: (m as { name: string }).name,
      createdAt: (m as { created_at: string }).created_at,
    })),
  };
});

/**
 * Validates that the database schema matches expectations
 */
export const validateDatabaseSchema = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  // Check required tables exist
  const requiredTables = ["settings"];
  const existingTables = yield* sql`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name = 'settings'
  `;

  const missingTables = requiredTables.filter(
    (table) =>
      !existingTables.some((row) => (row as { name: string }).name === table),
  );

  if (missingTables.length > 0) {
    return {
      valid: false,
      missingTables,
      errors: [`Missing tables: ${missingTables.join(", ")}`],
    };
  }

  // Check table schemas
  const settingsSchema = yield* sql`
    PRAGMA table_info(settings)
  `;

  const expectedColumns = ["key", "value", "updated_at"];
  const actualColumns = settingsSchema.map(
    (col) => (col as { name: string }).name,
  );

  const missingColumns = expectedColumns.filter(
    (col) => !actualColumns.includes(col),
  );

  if (missingColumns.length > 0) {
    return {
      valid: false,
      missingTables: [],
      errors: [`Settings table missing columns: ${missingColumns.join(", ")}`],
    };
  }

  return { valid: true, missingTables: [], errors: [] };
});

export { SqliteClientLive, DrizzleLive, MigrationsLive };
export { SqliteDrizzle } from "@effect/sql-drizzle/Sqlite";
export * from "./schema";
