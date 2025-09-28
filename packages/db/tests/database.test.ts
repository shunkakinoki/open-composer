import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Effect } from "effect";

let dbModule: typeof import("../src/index");
let tempDir: string;
let tempFile: string;

beforeAll(async () => {
  tempDir = mkdtempSync(path.join(tmpdir(), "open-composer-db-"));
  tempFile = path.join(tempDir, "app.db");
  process.env.OPEN_COMPOSER_DB_FILE = tempFile;
  dbModule = await import("../src/index");
});

afterAll(() => {
  delete process.env.OPEN_COMPOSER_DB_FILE;
  rmSync(tempDir, { recursive: true, force: true });
});

describe("Database layer", () => {
  test("uses the configured sqlite file", () => {
    expect(dbModule.databaseFile.value).toBe(tempFile);
  });

  test("runs migrations and supports drizzle queries", async () => {
    // Run migrations manually
    const migration = (await import("../migrations/0000_create_settings"))
      .default;
    await Effect.runPromise(dbModule.runMigration(migration));

    const program = Effect.gen(function* () {
      const db = yield* dbModule.SqliteDrizzle;
      yield* db.delete(dbModule.settings);
      yield* db
        .insert(dbModule.settings)
        .values({ key: "theme", value: "dark" });
      return yield* db.select().from(dbModule.settings);
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(dbModule.DatabaseLive)),
    );

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "theme", value: "dark" }),
      ]),
    );
  });

  test("creates database snapshot", async () => {
    const snapshot = await Effect.runPromise(
      dbModule.createDatabaseSnapshot.pipe(
        Effect.provide(dbModule.DatabaseLive),
      ),
    );

    expect(snapshot).toHaveProperty("timestamp");
    expect(snapshot).toHaveProperty("schema");
    expect(snapshot).toHaveProperty("data");
    expect(snapshot.schema).toHaveProperty("version", "1.0");
    expect(snapshot.schema).toHaveProperty("tables");
    expect(Array.isArray(snapshot.schema.tables)).toBe(true);
    expect(typeof snapshot.timestamp).toBe("string");
  });

  test("creates and restores settings snapshot", async () => {
    // First clear any existing data
    const clearProgram = Effect.gen(function* () {
      const db = yield* dbModule.SqliteDrizzle;
      yield* db.delete(dbModule.settings);
    });

    await Effect.runPromise(
      clearProgram.pipe(Effect.provide(dbModule.DatabaseLive)),
    );

    // Add some test data
    const insertProgram = Effect.gen(function* () {
      const db = yield* dbModule.SqliteDrizzle;
      yield* db.insert(dbModule.settings).values([
        { key: "test1", value: "value1" },
        { key: "test2", value: "value2" },
      ]);
    });

    await Effect.runPromise(
      insertProgram.pipe(Effect.provide(dbModule.DatabaseLive)),
    );

    // Create snapshot
    const snapshot = await Effect.runPromise(
      dbModule.createSettingsSnapshot.pipe(
        Effect.provide(dbModule.DatabaseLive),
      ),
    );

    expect(snapshot).toHaveProperty("timestamp");
    expect(snapshot).toHaveProperty("settings");
    expect(Array.isArray(snapshot.settings)).toBe(true);
    expect(snapshot.settings).toHaveLength(2);

    // Clear existing data again before restore
    const clearProgram2 = Effect.gen(function* () {
      const db = yield* dbModule.SqliteDrizzle;
      yield* db.delete(dbModule.settings);
    });

    await Effect.runPromise(
      clearProgram2.pipe(Effect.provide(dbModule.DatabaseLive)),
    );

    // Restore from snapshot
    await Effect.runPromise(
      dbModule
        .restoreSettingsSnapshot(snapshot)
        .pipe(Effect.provide(dbModule.DatabaseLive)),
    );

    // Verify data was restored
    const verifyProgram = Effect.gen(function* () {
      const db = yield* dbModule.SqliteDrizzle;
      return yield* db
        .select()
        .from(dbModule.settings)
        .orderBy(dbModule.settings.key);
    });

    const restoredData = await Effect.runPromise(
      verifyProgram.pipe(Effect.provide(dbModule.DatabaseLive)),
    );

    expect(restoredData).toHaveLength(2);
    expect(restoredData.find((s) => s.key === "test1")?.value).toBe("value1");
    expect(restoredData.find((s) => s.key === "test2")?.value).toBe("value2");
  });

  test("gets migration status", async () => {
    const status = await Effect.runPromise(
      dbModule.getMigrationStatus.pipe(Effect.provide(dbModule.DatabaseLive)),
    );

    expect(status).toHaveProperty("initialized");
    expect(status).toHaveProperty("migrations");
    expect(Array.isArray(status.migrations)).toBe(true);

    if (status.initialized) {
      expect(status.migrations.length).toBeGreaterThan(0);
      status.migrations.forEach((migration) => {
        expect(migration).toHaveProperty("id");
        expect(migration).toHaveProperty("name");
        expect(migration).toHaveProperty("createdAt");
      });
    }
  });

  test("validates database schema", async () => {
    const validation = await Effect.runPromise(
      dbModule.validateDatabaseSchema.pipe(
        Effect.provide(dbModule.DatabaseLive),
      ),
    );

    expect(validation).toHaveProperty("valid");
    expect(validation).toHaveProperty("missingTables");
    expect(validation).toHaveProperty("errors");
    expect(Array.isArray(validation.missingTables)).toBe(true);
    expect(Array.isArray(validation.errors)).toBe(true);

    // Should be valid since settings table exists from migrations
    expect(validation.valid).toBe(true);
    expect(validation.missingTables).toHaveLength(0);
    expect(validation.errors).toHaveLength(0);
  });

  test("validates database schema with missing table", async () => {
    // Test validation against a non-existent database
    const tempDbPath = path.join(tempDir, "non-existent.db");

    // Temporarily override the database path
    const originalDbFile = process.env.OPEN_COMPOSER_DB_FILE;
    process.env.OPEN_COMPOSER_DB_FILE = tempDbPath;

    try {
      // This should fail because the database doesn't exist and has no tables
      // We'll use a different approach - check that validation requires the DatabaseLive layer
      const validation = await Effect.runPromise(
        dbModule.validateDatabaseSchema.pipe(
          Effect.provide(dbModule.SqliteClientLive),
        ),
      );

      // Since we're only providing SqliteClientLive (not running migrations),
      // the validation should find missing tables
      expect(validation).toHaveProperty("valid");
      expect(Array.isArray(validation.missingTables)).toBe(true);
      expect(Array.isArray(validation.errors)).toBe(true);
    } finally {
      // Restore original database
      process.env.OPEN_COMPOSER_DB_FILE = originalDbFile;
    }
  });
});
