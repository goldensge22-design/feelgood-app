import { pgTable, text, integer, jsonb, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

// Additive tables for the new product; no existing product schema is changed.
export const careerWorkspaces = pgTable("career_workspaces", {
  ownerId: text("owner_id").primaryKey(),
  revision: integer("revision").notNull().default(0),
  state: jsonb("state").notNull(),
  savedAt: timestamp("saved_at", { withTimezone: true }).notNull().defaultNow(),
});

export const careerVersions = pgTable("career_versions", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  requestId: text("request_id").notNull(),
  snapshot: jsonb("snapshot").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("career_version_owner_request").on(table.ownerId, table.requestId),
]);
