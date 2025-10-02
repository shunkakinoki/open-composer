import {
  type NewSetting,
  type Setting,
  SqliteDrizzle,
  settings,
} from "@open-composer/db";
import { count, eq } from "drizzle-orm";
import { Context, Effect, Layer } from "effect";

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
        // biome-ignore lint/suspicious/noExplicitAny: Drizzle type incompatibility with exactOptionalPropertyTypes
        const db = yield* SqliteDrizzle as any;
        const result = (yield* db
          .select()
          // biome-ignore lint/suspicious/noExplicitAny: Drizzle type incompatibility
          .from(settings as any)
          // biome-ignore lint/suspicious/noExplicitAny: Drizzle type incompatibility
          .where(eq((settings as any).key, key))
          .limit(1)) as Setting[] | undefined;

        return result && result.length > 0 ? result[0].value : null;
      }).pipe(
        Effect.mapError((error) =>
          error instanceof Error ? error : new Error(String(error)),
        ),
      ) as Effect.Effect<string | null, Error, SqliteDrizzle>,

    setSetting: (key: string, value: string) =>
      Effect.gen(function* () {
        // biome-ignore lint/suspicious/noExplicitAny: Drizzle type incompatibility with exactOptionalPropertyTypes
        const db = yield* SqliteDrizzle as any;
        yield* db
          // biome-ignore lint/suspicious/noExplicitAny: Drizzle type incompatibility
          .insert(settings as any)
          .values({
            key,
            value,
            updatedAt: new Date().toISOString(),
          } as NewSetting)
          .onConflictDoUpdate({
            // biome-ignore lint/suspicious/noExplicitAny: Drizzle type incompatibility
            target: (settings as any).key,
            set: {
              value,
              updatedAt: new Date().toISOString(),
            },
          });
      }).pipe(
        Effect.mapError((error) =>
          error instanceof Error ? error : new Error(String(error)),
        ),
      ) as Effect.Effect<void, Error, SqliteDrizzle>,

    getAllSettings: () =>
      Effect.gen(function* () {
        // biome-ignore lint/suspicious/noExplicitAny: Drizzle type incompatibility with exactOptionalPropertyTypes
        const db = yield* SqliteDrizzle as any;
        const result = yield* db
          .select()
          // biome-ignore lint/suspicious/noExplicitAny: Drizzle type incompatibility
          .from(settings as any)
          // biome-ignore lint/suspicious/noExplicitAny: Drizzle type incompatibility
          .orderBy((settings as any).key) as Setting[];
        return result || [];
      }).pipe(
        Effect.mapError((error) =>
          error instanceof Error ? error : new Error(String(error)),
        ),
      ) as Effect.Effect<
        Array<{ key: string; value: string; updatedAt: string }>,
        Error,
        SqliteDrizzle
      >,

    deleteSetting: (key: string) =>
      Effect.gen(function* () {
        // biome-ignore lint/suspicious/noExplicitAny: Drizzle type incompatibility with exactOptionalPropertyTypes
        const db = yield* SqliteDrizzle as any;
        // biome-ignore lint/suspicious/noExplicitAny: Drizzle type incompatibility with exactOptionalPropertyTypes
        yield* db.delete(settings as any).where(eq((settings as any).key, key));

        // Check if the setting was actually deleted by trying to get it
        const existsAfter = yield* Effect.tryPromise(async () => {
          const result = (await db
            .select({ count: count() })
            // biome-ignore lint/suspicious/noExplicitAny: Drizzle type incompatibility
            .from(settings as any)
            // biome-ignore lint/suspicious/noExplicitAny: Drizzle type incompatibility
            .where(eq((settings as any).key, key))
            .limit(1)) as { count: number }[];
          // biome-ignore lint/suspicious/noExplicitAny: Drizzle type incompatibility
          return ((result as any)[0]?.count ?? 0) > 0;
        });

        return !existsAfter;
      }).pipe(
        Effect.mapError((error) =>
          error instanceof Error ? error : new Error(String(error)),
        ),
      ) as Effect.Effect<boolean, Error, SqliteDrizzle>,

    hasSetting: (key: string) =>
      Effect.gen(function* () {
        // biome-ignore lint/suspicious/noExplicitAny: Drizzle type incompatibility with exactOptionalPropertyTypes
        const db = yield* SqliteDrizzle as any;
        const result = yield* db
          .select({ count: count() })
          // biome-ignore lint/suspicious/noExplicitAny: Drizzle type incompatibility
          .from(settings as any)
          // biome-ignore lint/suspicious/noExplicitAny: Drizzle type incompatibility
          .where(eq((settings as any).key, key))
          .limit(1) as { count: number }[];

        // biome-ignore lint/suspicious/noExplicitAny: Drizzle type incompatibility
        return ((result as any)[0]?.count ?? 0) > 0;
      }).pipe(
        Effect.mapError((error) =>
          error instanceof Error ? error : new Error(String(error)),
        ),
      ) as Effect.Effect<boolean, Error, SqliteDrizzle>,
  };
}

/**
 * Live implementation of the SettingsService
 */
export const SettingsLive = Layer.effect(
  SettingsService,
  Effect.succeed(createSettingsService()),
);
