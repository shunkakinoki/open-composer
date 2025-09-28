import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Application-wide key-value configuration.
 */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

/**
 * User accounts.
 */
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").unique(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

/**
 * Development sessions for tracking work contexts and git workspaces.
 */
export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  workspacePath: text("workspace_path"),
  description: text("description"),
  status: text("status").default("active").notNull(), // active, archived, completed
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
