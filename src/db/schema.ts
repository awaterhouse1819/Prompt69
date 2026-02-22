import { desc, sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const prompts = pgTable("prompts", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  tags: text("tags").array().notNull().default(sql`ARRAY[]::text[]`),
  currentVersionId: uuid("current_version_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const promptVersions = pgTable(
  "prompt_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    promptId: uuid("prompt_id")
      .notNull()
      .references(() => prompts.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    content: text("content").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    promptVersionUnique: uniqueIndex("prompt_versions_prompt_id_version_number_uniq").on(
      table.promptId,
      table.versionNumber,
    ),
    promptVersionLookup: index("prompt_versions_prompt_id_version_number_idx").on(
      table.promptId,
      table.versionNumber,
    ),
  }),
);

export const testRunStatusEnum = pgEnum("test_run_status", [
  "queued",
  "running",
  "succeeded",
  "failed",
]);

export const testRuns = pgTable(
  "test_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    promptId: uuid("prompt_id")
      .notNull()
      .references(() => prompts.id, { onDelete: "cascade" }),
    promptVersionId: uuid("prompt_version_id")
      .notNull()
      .references(() => promptVersions.id, { onDelete: "restrict" }),
    status: testRunStatusEnum("status").notNull().default("queued"),
    model: text("model").notNull(),
    params: jsonb("params").notNull().default(sql`'{}'::jsonb`),
    inputVariables: jsonb("input_variables").notNull().default(sql`'{}'::jsonb`),
    output: text("output"),
    usage: jsonb("usage"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    testRunPromptCreatedAt: index("test_runs_prompt_id_created_at_idx").on(
      table.promptId,
      desc(table.createdAt),
    ),
  }),
);
