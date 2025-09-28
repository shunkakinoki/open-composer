import { SqlClient } from "@effect/sql";
import { Effect } from "effect";

export default Effect.flatMap(
  SqlClient.SqlClient,
  (sql) =>
    sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      workspace_path TEXT,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `,
);
