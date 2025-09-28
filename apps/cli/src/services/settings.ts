import {
  initializeDatabase,
  type NewSetting,
  SqliteDrizzle,
  settings,
} from "@open-composer/db";
import { count, eq } from "drizzle-orm";
import { Context, Effect, Layer } from "effect";

// Track if database has been initialized
let isDatabaseInitialized = false;

/**
 * Ensure database is initialized before any operations
 */
const ensureDatabaseInitialized = Effect.gen(function* () {
  if (!isDatabaseInitialized) {
    yield* initializeDatabase;
    isDatabaseInitialized = true;
  }
});

/**
 * Service for managing application settings stored in the database
 */
export interface SettingsServiceInterface {
  /**
   * Get a setting value by key
   */
  getSetting: (
    key: string,
  ) => Effect.Effect<string | null, Error, SqliteDrizzle>;

  /**
   * Set a setting value
   */
  setSetting: (
    key: string,
    value: string,
  ) => Effect.Effect<void, Error, SqliteDrizzle>;

  /**
   * Get all settings
   */
  getAllSettings: () => Effect.Effect<
    Array<{ key: string; value: string; updatedAt: string }>,
    Error,
    SqliteDrizzle
  >;

  /**
   * Delete a setting by key
   */
  deleteSetting: (key: string) => Effect.Effect<boolean, Error, SqliteDrizzle>;

  /**
   * Check if a setting exists
   */
  hasSetting: (key: string) => Effect.Effect<boolean, Error, SqliteDrizzle>;
}

/**
 * Settings service tag
 */
export const SettingsService = Context.GenericTag<SettingsServiceInterface>(
  "@open-composer/settings/SettingsService",
);

/**
 * Create settings service implementation
 */
function createSettingsService(): SettingsServiceInterface {
  return {
    getSetting: (key: string) =>
      Effect.gen(function* () {
        yield* ensureDatabaseInitialized;

        const db = yield* SqliteDrizzle;
        const result = yield* db
          .select()
          .from(settings)
          .where(eq(settings.key, key))
          .limit(1);

        return result.length > 0 ? result[0].value : null;
      }).pipe(Effect.mapError(error => error instanceof Error ? error : new Error(String(error)))),

    setSetting: (key: string, value: string) =>
      Effect.gen(function* () {
        yield* ensureDatabaseInitialized;

        const db = yield* SqliteDrizzle;
        yield* db
          .insert(settings)
          .values({
            key,
            value,
            updatedAt: new Date().toISOString(),
          } as NewSetting)
          .onConflictDoUpdate({
            target: settings.key,
            set: {
              value,
              updatedAt: new Date().toISOString(),
            },
          });
      }).pipe(Effect.mapError(error => error instanceof Error ? error : new Error(String(error)))),

    getAllSettings: () =>
      Effect.gen(function* () {
        yield* ensureDatabaseInitialized;

        const db = yield* SqliteDrizzle;
        return yield* db.select().from(settings).orderBy(settings.key);
      }).pipe(Effect.mapError(error => error instanceof Error ? error : new Error(String(error)))),

    deleteSetting: (key: string) =>
      Effect.gen(function* () {
        yield* ensureDatabaseInitialized;

        const db = yield* SqliteDrizzle;
        yield* db.delete(settings).where(eq(settings.key, key));

        // Check if the setting was actually deleted by trying to get it
        const existsAfter = yield* Effect.tryPromise(async () => {
          const result = await db
            .select({ count: count() })
            .from(settings)
            .where(eq(settings.key, key))
            .limit(1);
          return (result[0]?.count ?? 0) > 0;
        });

        return !existsAfter;
      }).pipe(Effect.mapError(error => error instanceof Error ? error : new Error(String(error)))),

    hasSetting: (key: string) =>
      Effect.gen(function* () {
        yield* ensureDatabaseInitialized;

        const db = yield* SqliteDrizzle;
        const result = yield* db
          .select({ count: count() })
          .from(settings)
          .where(eq(settings.key, key))
          .limit(1);

        return (result[0]?.count ?? 0) > 0;
      }).pipe(Effect.mapError(error => error instanceof Error ? error : new Error(String(error)))),
  };
}

/**
 * Live implementation of the SettingsService
 */
export const SettingsLive = Layer.effect(
  SettingsService,
  Effect.succeed(createSettingsService()),
);
