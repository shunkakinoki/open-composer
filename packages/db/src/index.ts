import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import * as path from "node:path";
import { BunContext } from "@effect/platform-bun";
import { SqlClient } from "@effect/sql";
import * as SqliteDrizzle from "@effect/sql-drizzle/Sqlite";
import { SqliteClient } from "@effect/sql-sqlite-bun";
import { Effect, Layer } from "effect";
import migration0000 from "../migrations/0000_create_settings.js";
import migration0001 from "../migrations/0001_add_user_table.js";
import migration0002 from "../migrations/0002_add_sessions_table.js";
import type { Setting } from "./schema.js";
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

// Static list of migrations to avoid filesystem reads in compiled binaries
const MIGRATIONS = [
  { id: 0, name: "0000_create_settings", effect: migration0000 },
  { id: 1, name: "0001_add_user_table", effect: migration0001 },
  { id: 2, name: "0002_add_sessions_table", effect: migration0002 },
];

const SqliteClientLive = Layer.unwrapEffect(
  Effect.gen(function* () {
    // Add timeout to directory creation to prevent hanging on slow/network filesystems
    yield* Effect.tryPromise(() =>
      mkdir(databaseDirectory.value, { recursive: true }),
    ).pipe(
      Effect.timeout("5 seconds"),
      Effect.catchTag("TimeoutException", () =>
        Effect.fail(
          new Error(
            `Failed to create database directory within timeout: ${databaseDirectory.value}`,
          ),
        ),
      ),
    );

    // Return the SQLite layer
    // Note: The actual database connection happens lazily when queries are executed
    // The initializeDatabase function has its own timeout to catch connection hangs
    return SqliteClient.layer({
      filename: databaseFile.value,
      // Create the database if it doesn't exist
      create: true,
      // Allow read-write operations
      readwrite: true,
    });
  }),
);

/**
 * Initializes the database by running migrations
 * Wrapped with timeout to prevent hanging
 */
const initializeDatabaseCore = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  // Create migrations table if it doesn't exist
  // Wrap in timeout to prevent hanging on database locks
  yield* sql`
    CREATE TABLE IF NOT EXISTS effect_sql_migrations (
      migration_id INTEGER PRIMARY KEY NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      name VARCHAR(255) NOT NULL
    )
  `.pipe(
    Effect.timeout("3 seconds"),
    Effect.catchTag("TimeoutException", () =>
      Effect.fail(
        new Error("Timed out creating migrations table - database may be locked"),
      ),
    ),
  );

  // Run each migration in order, tracking them
  for (const migration of MIGRATIONS) {
    // Check if migration already ran - with timeout
    const existing = yield* sql`
      SELECT migration_id FROM effect_sql_migrations WHERE migration_id = ${migration.id}
    `.pipe(
      Effect.timeout("3 seconds"),
      Effect.catchTag("TimeoutException", () =>
        Effect.fail(
          new Error(
            `Timed out checking migration ${migration.id} - database may be locked`,
          ),
        ),
      ),
    );

    if (existing.length === 0) {
      // Run the migration with timeout
      yield* migration.effect.pipe(
        Effect.timeout("5 seconds"),
        Effect.catchTag("TimeoutException", () =>
          Effect.fail(
            new Error(
              `Migration ${migration.id} (${migration.name}) timed out after 5 seconds`,
            ),
          ),
        ),
      );

      // Record the migration with timeout
      yield* sql`
        INSERT INTO effect_sql_migrations (migration_id, name, created_at)
        VALUES (${migration.id}, ${migration.name}, ${new Date().toISOString()})
      `.pipe(
        Effect.timeout("3 seconds"),
        Effect.catchTag("TimeoutException", () =>
          Effect.fail(
            new Error(
              `Timed out recording migration ${migration.id} - database may be locked`,
            ),
          ),
        ),
      );
    }
  }
});

/**
 * Initializes the database with a timeout to prevent hanging
 */
export const initializeDatabase = initializeDatabaseCore.pipe(
  Effect.timeout("10 seconds"),
  Effect.catchTag("TimeoutException", () =>
    Effect.fail(
      new Error(
        "Database initialization timed out after 10 seconds. This may indicate a database lock or slow filesystem.",
      ),
    ),
  ),
);

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
    // biome-ignore lint/suspicious/noExplicitAny: Drizzle type incompatibility
    .from(schema.settings as any)
    // biome-ignore lint/suspicious/noExplicitAny: Drizzle type incompatibility
    .orderBy(schema.settings.key as any);

  return {
    timestamp: new Date().toISOString(),
    settings: (settings as Setting[]).map((setting) => ({
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
    // biome-ignore lint/suspicious/noExplicitAny: Drizzle type incompatibility
    yield* db.delete(schema.settings as any);

    // Insert snapshot settings
    if (snapshot.settings.length > 0) {
      // biome-ignore lint/suspicious/noExplicitAny: Drizzle type incompatibility
      yield* db.insert(schema.settings as any).values(
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
export * from "./schema.js";
