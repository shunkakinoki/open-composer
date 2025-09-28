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
    expect(dbModule.databaseFile).toBe(tempFile);
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
});
