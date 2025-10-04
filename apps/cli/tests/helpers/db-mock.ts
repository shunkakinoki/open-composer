import { mock } from "bun:test";
import type { Session } from "@open-composer/db";
import { SqliteDrizzle } from "@open-composer/db";
import type * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

type WhereCondition = {
  sql?: { queryChunks: string[] };
  [key: string]: unknown;
};

/**
 * Creates a mock database instance for testing
 */
export function createMockDb() {
  const storage: {
    sessions: Session[];
  } = {
    sessions: [],
  };

  let nextId = 1;

  // Mock query builder chain
  const createQueryBuilder = (
    operationType?: "select" | "insert" | "update" | "delete",
  ) => {
    let whereCondition: WhereCondition | null = null;
    let orderByValue: unknown = null;
    let insertValues: Partial<Session> | null = null;
    let updateValues: Partial<Session> | null = null;
    let currentOperation = operationType;

    const matchesWhere = (session: Session): boolean => {
      if (!whereCondition) return true;

      // Handle Drizzle's eq() condition
      // Drizzle's eq() returns an object with queryChunks array
      // queryChunks[3] contains { value: actualValue, encoder: ... }
      const condition = whereCondition as WhereCondition & {
        queryChunks?: Array<{ value?: unknown; name?: string }>;
      };

      if (!condition.queryChunks || condition.queryChunks.length < 4)
        return false;

      // Extract the comparison value from queryChunks[3].value
      const valueChunk = condition.queryChunks[3];
      if (!valueChunk || !("value" in valueChunk)) return false;

      const compareValue = valueChunk.value;
      if (compareValue === null || compareValue === undefined) return false;

      // Try matching common fields
      if (session.id === compareValue) return true;
      if (session.status === compareValue) return true;
      if (session.name === compareValue) return true;

      return false;
    };

    const executeQuery = (): Effect.Effect<Session[] | Session | undefined> => {
      if (currentOperation === "select") {
        let results = storage.sessions;
        if (whereCondition) {
          results = results.filter(matchesWhere);
        }
        if (orderByValue) {
          // Simple descending sort by createdAt
          results = [...results].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
        }
        return Effect.succeed(results);
      }
      if (currentOperation === "update" && updateValues) {
        // Execute update without returning
        const toUpdate = whereCondition
          ? storage.sessions.filter(matchesWhere)
          : storage.sessions;

        toUpdate.forEach((session) => {
          const index = storage.sessions.findIndex((s) => s.id === session.id);
          if (index !== -1) {
            storage.sessions[index] = { ...session, ...updateValues };
          }
        });
        return Effect.succeed(undefined);
      }
      if (currentOperation === "delete") {
        // Execute delete without returning
        storage.sessions = storage.sessions.filter((s) => !matchesWhere(s));
        return Effect.succeed(undefined);
      }
      return Effect.succeed(undefined);
    };

    // Create a proxy that will be used for all builder references
    let proxyBuilder: unknown;

    const builderMethods = {
      from: (_table: unknown) => {
        return proxyBuilder;
      },
      select: () => {
        currentOperation = "select";
        return proxyBuilder;
      },
      where: (condition: WhereCondition) => {
        whereCondition = condition;
        return proxyBuilder;
      },
      orderBy: (value: unknown) => {
        orderByValue = value;
        return proxyBuilder;
      },
      insert: (_table: unknown) => {
        currentOperation = "insert";
        return proxyBuilder;
      },
      values: (vals: Partial<Session>) => {
        insertValues = vals;
        return proxyBuilder;
      },
      update: (_table: unknown) => {
        currentOperation = "update";
        return proxyBuilder;
      },
      set: (vals: Partial<Session>) => {
        updateValues = vals;
        return proxyBuilder;
      },
      delete: (_table: unknown) => {
        currentOperation = "delete";
        return proxyBuilder;
      },
      returning: () => {
        if (currentOperation === "insert" && insertValues) {
          // Insert operation
          const newSession: Session = {
            id: nextId++,
            name: insertValues.name || "",
            workspacePath: insertValues.workspacePath ?? null,
            description: insertValues.description ?? null,
            status: insertValues.status || "active",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          storage.sessions.push(newSession);
          return Effect.succeed([newSession]);
        }
        if (currentOperation === "update" && updateValues) {
          // Update operation - update all matching or all if no where clause
          const toUpdate = whereCondition
            ? storage.sessions.filter(matchesWhere)
            : storage.sessions;

          const updated = toUpdate.map((session) => {
            const updatedSession = { ...session, ...updateValues };
            const index = storage.sessions.findIndex(
              (s) => s.id === session.id,
            );
            if (index !== -1) {
              storage.sessions[index] = updatedSession;
            }
            return updatedSession;
          });
          return Effect.succeed(updated);
        }
        if (currentOperation === "delete") {
          // Delete operation
          const toDelete = whereCondition
            ? storage.sessions.filter(matchesWhere)
            : [];
          storage.sessions = storage.sessions.filter((s) => !matchesWhere(s));
          return Effect.succeed(toDelete);
        }
        return Effect.succeed([]);
      },
    };

    // Wrap methods with mock
    const builder = {
      from: mock(builderMethods.from),
      select: mock(builderMethods.select),
      where: mock(builderMethods.where),
      orderBy: mock(builderMethods.orderBy),
      insert: mock(builderMethods.insert),
      values: mock(builderMethods.values),
      update: mock(builderMethods.update),
      set: mock(builderMethods.set),
      delete: mock(builderMethods.delete),
      returning: mock(builderMethods.returning),
    };

    // Create the proxy and assign it
    proxyBuilder = new Proxy(builder, {
      get(target, prop) {
        // Handle Effect protocol methods
        if (prop === "then") {
          const effect = executeQuery();
          // biome-ignore lint/suspicious/noExplicitAny: Effect internal protocol
          return (effect as any).then?.bind(effect);
        }
        if (prop === "pipe") {
          const effect = executeQuery();
          return effect.pipe?.bind(effect);
        }
        if (prop === Symbol.iterator) {
          const effect = executeQuery();
          return effect[Symbol.iterator]?.bind(effect);
        }
        // Return builder methods
        return target[prop as keyof typeof target];
      },
    });

    return proxyBuilder;
  };

  const mockDb = {
    select: mock(() => createQueryBuilder("select")),
    insert: mock((_table: unknown) => createQueryBuilder("insert")),
    update: mock((_table: unknown) => createQueryBuilder("update")),
    delete: mock((_table: unknown) => createQueryBuilder("delete")),
    // Expose storage for test inspection
    _storage: storage,
    _resetId: () => {
      nextId = 1;
    },
  };

  return mockDb;
}

/**
 * Creates a mock Effect-based SqliteDrizzle service with proper Context integration
 */
export function createMockSqliteDrizzle() {
  const mockDb = createMockDb();

  // Create a layer that provides the mock database
  const mockLayer = Layer.succeed(
    SqliteDrizzle,
    mockDb as unknown as Context.Tag.Service<typeof SqliteDrizzle>,
  );

  return {
    mockDb,
    layer: mockLayer,
  };
}
