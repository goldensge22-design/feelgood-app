import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";

// Independent fictional review data; never a FeelGood identity mapping.
export const nuviaWorkspaces = pgTable("nuvia_review_workspaces", {
  subjectId: text("subject_id").primaryKey(),
  document: jsonb("document").notNull(),
});

export const nuviaSessions = pgTable("nuvia_review_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  account: text("account").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
