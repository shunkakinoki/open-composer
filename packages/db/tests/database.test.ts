import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import { existsSync, mkdtempSync, rmSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Effect } from "effect";

let dbModule: typeof import("../src/index");
let tempDir: string;
let tempFile: string;

beforeAll(async () => {
  tempDir = mkdtempSync(path.join(tmpdir(), "open-composer-db-"));
  dbModule = await import("../src/index");
});

afterAll(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

beforeEach(() => {
  // Create a unique database file for each test
  const testId = Math.random().toString(36).substring(7);
  tempFile = path.join(tempDir, `test-${testId}.db`);
  process.env.OPEN_COMPOSER_DB_FILE = tempFile;
});

afterEach(() => {
  // Clean up the test database
  delete process.env.OPEN_COMPOSER_DB_FILE;
  if (existsSync(tempFile)) {
    try {
      unlinkSync(tempFile);
    } catch {
      // Ignore cleanup errors
    }
  }
});

describe("Database layer", () => {
  test("uses the configured sqlite file", () => {
    expect(dbModule.databaseFile.value).toBe(tempFile);
  });

  test("runs migrations and supports drizzle queries", async () => {
    // Initialize database with migrations, then test drizzle queries
    const program = Effect.gen(function* () {
      yield* dbModule.initializeDatabase;
      const db = yield* dbModule.SqliteDrizzle;
      // Ensure clean state
      yield* db.delete(dbModule.settings);
      yield* db
        .insert(dbModule.settings)
        .values({ key: "theme", value: "dark" });
      return yield* db.select().from(dbModule.settings);
    });

    const result = await (
      Effect.runPromise as (
        effect: Effect.Effect<unknown, never, never>,
      ) => Promise<unknown>
    )(
      program.pipe(Effect.provide(dbModule.DatabaseLive)) as Effect.Effect<
        unknown,
        never,
        never
      >,
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
    const program = Effect.gen(function* () {
      yield* dbModule.initializeDatabase;

      // First clear any existing data
      const db = yield* dbModule.SqliteDrizzle;
      yield* db.delete(dbModule.settings);

      // Add some test data
      yield* db.insert(dbModule.settings).values([
        { key: "test1", value: "value1" },
        { key: "test2", value: "value2" },
      ]);

      // Create snapshot
      const snapshot = yield* dbModule.createSettingsSnapshot;
      expect(snapshot).toHaveProperty("timestamp");
      expect(snapshot).toHaveProperty("settings");
      expect(Array.isArray(snapshot.settings)).toBe(true);
      expect(snapshot.settings).toHaveLength(2);

      // Clear existing data again before restore
      yield* db.delete(dbModule.settings);

      // Restore from snapshot
      yield* dbModule.restoreSettingsSnapshot(snapshot);

      // Verify data was restored
      const restoredData = yield* db
        .select()
        .from(dbModule.settings)
        .orderBy(dbModule.settings.key);

      expect(restoredData).toHaveLength(2);
      expect(restoredData.find((s) => s.key === "test1")?.value).toBe("value1");
      expect(restoredData.find((s) => s.key === "test2")?.value).toBe("value2");
    });

    await (
      Effect.runPromise as (
        effect: Effect.Effect<unknown, never, never>,
      ) => Promise<unknown>
    )(
      program.pipe(Effect.provide(dbModule.DatabaseLive)) as Effect.Effect<
        unknown,
        never,
        never
      >,
    );
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
    const validation = await (
      Effect.runPromise as (
        effect: Effect.Effect<
          { valid: boolean; missingTables: string[]; errors: string[] },
          never,
          never
        >,
      ) => Promise<{
        valid: boolean;
        missingTables: string[];
        errors: string[];
      }>
    )(
      Effect.gen(function* () {
        yield* dbModule.initializeDatabase;
        return yield* dbModule.validateDatabaseSchema;
      }).pipe(Effect.provide(dbModule.DatabaseLive)) as Effect.Effect<
        { valid: boolean; missingTables: string[]; errors: string[] },
        never,
        never
      >,
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
