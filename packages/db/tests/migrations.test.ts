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

let tempDir: string;
let dbFile: string;

beforeAll(async () => {
  tempDir = mkdtempSync(path.join(tmpdir(), "open-composer-migrations-"));
});

afterAll(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

beforeEach(() => {
  // Create a unique database file for each test
  const testId = Math.random().toString(36).substring(7);
  dbFile = path.join(tempDir, `test-${testId}.db`);
  process.env.OPEN_COMPOSER_DB_FILE = dbFile;
});

afterEach(() => {
  // Clean up the test database
  if (existsSync(dbFile)) {
    try {
      unlinkSync(dbFile);
    } catch {
      // Ignore cleanup errors
    }
  }
  delete process.env.OPEN_COMPOSER_DB_FILE;
});

describe("Migration Functionality", () => {
  let dbModule: typeof import("../src/index");

  beforeAll(async () => {
    // Import the module once for all tests
    dbModule = await import("../src/index");
  });

  describe("Database Initialization", () => {
    test("initializes database with migrations", async () => {
      const program = Effect.gen(function* () {
        // DatabaseWithMigrationsLive already runs migrations, so just verify they worked

        // Verify migrations ran by checking migration status
        const status = yield* dbModule.getMigrationStatus;
        expect(status.initialized).toBe(true);
        expect(status.migrations.length).toBeGreaterThan(0);

        // Verify tables were created
        const validation = yield* dbModule.validateDatabaseSchema;
        expect(validation.valid).toBe(true);

        return status;
      });

      const result = await Effect.runPromiseExit(
        program.pipe(
          Effect.provide(dbModule.DatabaseWithMigrationsLive),
        ) as Effect.Effect<
          {
            initialized: boolean;
            migrations: { id: string; name: string; createdAt: string }[];
          },
          unknown,
          never
        >,
      );

      if (result._tag === "Failure") {
        throw new Error(`Migration test failed: ${result.cause}`);
      }

      expect(result.value.migrations.length).toBeGreaterThan(0); // Migrations ran successfully
    });

    test("creates proper directory structure", async () => {
      const program = Effect.gen(function* () {
        // Check that database file was created
        const fs = yield* Effect.promise(() => import("node:fs/promises"));
        const dbExists = yield* Effect.promise(() =>
          fs
            .access(dbModule.databaseFile.value)
            .then(() => true)
            .catch(() => false),
        );
        expect(dbExists).toBe(true);
      });

      const result = await Effect.runPromiseExit(
        program.pipe(
          Effect.provide(dbModule.DatabaseWithMigrationsLive),
        ) as Effect.Effect<unknown, unknown, never>,
      );

      if (result._tag === "Failure") {
        throw new Error(`Directory structure test failed: ${result.cause}`);
      }
    });
  });

  describe("Migration Status Tracking", () => {
    test("tracks migration execution correctly", async () => {
      const program = Effect.gen(function* () {
        // After initialization (migrations already ran via DatabaseWithMigrationsLive)
        const afterStatus = yield* dbModule.getMigrationStatus;
        expect(afterStatus.initialized).toBe(true);

        // Verify migration details
        expect(afterStatus.migrations.length).toBeGreaterThan(0);
        afterStatus.migrations.forEach((migration) => {
          expect(migration).toHaveProperty("id");
          expect(migration).toHaveProperty("name");
          expect(migration).toHaveProperty("createdAt");
        });
      });

      await Effect.runPromise(
        program.pipe(
          Effect.provide(dbModule.DatabaseWithMigrationsLive),
        ) as Effect.Effect<unknown, unknown, never>,
      );
    });
  });

  describe("Schema Validation", () => {
    test("validates complete database schema", async () => {
      const program = Effect.gen(function* () {
        const validation = yield* dbModule.validateDatabaseSchema;

        expect(validation).toEqual({
          valid: true,
          missingTables: [],
          errors: [],
        });
      });

      await Effect.runPromise(
        program.pipe(
          Effect.provide(dbModule.DatabaseWithMigrationsLive),
        ) as Effect.Effect<unknown, unknown, never>,
      );
    });
  });

  describe("Settings Snapshot", () => {
    test("creates settings snapshot", async () => {
      const program = Effect.gen(function* () {
        const snapshot = yield* dbModule.createSettingsSnapshot;
        expect(snapshot).toHaveProperty("timestamp");
        expect(snapshot).toHaveProperty("settings");
        expect(Array.isArray(snapshot.settings)).toBe(true);
      });

      await Effect.runPromise(
        program.pipe(
          Effect.provide(dbModule.DatabaseWithMigrationsLive),
        ) as Effect.Effect<unknown, unknown, never>,
      );
    });

    test("restores settings snapshot", async () => {
      const program = Effect.gen(function* () {
        // Create snapshot
        const snapshot = yield* dbModule.createSettingsSnapshot;

        // Restore from snapshot
        yield* dbModule.restoreSettingsSnapshot(snapshot);

        // Should not throw an error
        expect(true).toBe(true);
      });

      await Effect.runPromise(
        program.pipe(
          Effect.provide(dbModule.DatabaseWithMigrationsLive),
        ) as Effect.Effect<unknown, unknown, never>,
      );
    });
  });

  describe("Database Snapshot", () => {
    test("creates database snapshot structure", async () => {
      const program = Effect.gen(function* () {
        const snapshot = yield* dbModule.createDatabaseSnapshot;

        expect(snapshot).toHaveProperty("timestamp");
        expect(snapshot).toHaveProperty("schema");
        expect(snapshot).toHaveProperty("data");
        expect(snapshot.schema).toHaveProperty("version", "1.0");
        expect(snapshot.schema).toHaveProperty("tables");
        expect(Array.isArray(snapshot.schema.tables)).toBe(true);
        expect(typeof snapshot.data).toBe("object");
      });

      const result = await Effect.runPromiseExit(
        program.pipe(
          Effect.provide(dbModule.DatabaseWithMigrationsLive),
        ) as Effect.Effect<unknown, unknown, never>,
      );

      if (result._tag === "Failure") {
        throw new Error(`Database snapshot test failed: ${result.cause}`);
      }
    });
  });
});
