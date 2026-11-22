import { index, jsonb, pgTable, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Coordination only: no raw prompts, account IDs or student originals.
export const careerAiControls = pgTable("career_ai_controls", {
  scope: text("scope").primaryKey(),
  keyTag: text("key_tag").notNull(),
  state: jsonb("state").notNull(),
});
export const careerAiJobs = pgTable("career_ai_jobs", {
  requestKey: text("request_key").primaryKey(),
  scope: text("scope").notNull(),
  ownerKey: text("owner_key").notNull(),
  state: jsonb("state").notNull(),
}, table => [index("career_ai_jobs_scope_idx").on(table.scope), index("career_ai_jobs_owner_idx").on(table.ownerKey)]);
export const careerAiOwners = pgTable("career_ai_owners", {
  ownerKey: text("owner_key").primaryKey(),
  scope: text("scope").notNull(),
  state: jsonb("state").notNull(),
}, table => [index("career_ai_owners_scope_idx").on(table.scope)]);
export const insertCareerAiControl = createInsertSchema(careerAiControls);
export const insertCareerAiJob = createInsertSchema(careerAiJobs);
export const insertCareerAiOwner = createInsertSchema(careerAiOwners);
