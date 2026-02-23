import { desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { prompts } from "@/db/schema";

export type PromptRow = typeof prompts.$inferSelect;
export type PromptInsert = Pick<typeof prompts.$inferInsert, "title" | "type" | "tags">;
export type PromptUpdate = {
  title?: string;
  tags?: string[];
};

export async function listPromptsByUpdatedAt() {
  return db
    .select({
      id: prompts.id,
      title: prompts.title,
      type: prompts.type,
      tags: prompts.tags,
      currentVersionId: prompts.currentVersionId,
      createdAt: prompts.createdAt,
      updatedAt: prompts.updatedAt,
    })
    .from(prompts)
    .orderBy(desc(prompts.updatedAt));
}

export async function createPrompt(input: PromptInsert) {
  const [createdPrompt] = await db
    .insert(prompts)
    .values(input)
    .returning({
      id: prompts.id,
      title: prompts.title,
      type: prompts.type,
      tags: prompts.tags,
      currentVersionId: prompts.currentVersionId,
      createdAt: prompts.createdAt,
      updatedAt: prompts.updatedAt,
    });

  return createdPrompt ?? null;
}

export async function findPromptById(promptId: string) {
  const [promptRow] = await db
    .select({
      id: prompts.id,
      title: prompts.title,
      type: prompts.type,
      tags: prompts.tags,
      currentVersionId: prompts.currentVersionId,
      createdAt: prompts.createdAt,
      updatedAt: prompts.updatedAt,
    })
    .from(prompts)
    .where(eq(prompts.id, promptId));

  return promptRow ?? null;
}

export async function updatePromptById(promptId: string, updates: PromptUpdate) {
  const [updatedPrompt] = await db
    .update(prompts)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(prompts.id, promptId))
    .returning({
      id: prompts.id,
      title: prompts.title,
      type: prompts.type,
      tags: prompts.tags,
      currentVersionId: prompts.currentVersionId,
      createdAt: prompts.createdAt,
      updatedAt: prompts.updatedAt,
    });

  return updatedPrompt ?? null;
}

export async function deletePromptById(promptId: string) {
  const [deletedPrompt] = await db
    .delete(prompts)
    .where(eq(prompts.id, promptId))
    .returning({
      id: prompts.id,
    });

  return deletedPrompt ?? null;
}

export async function setPromptCurrentVersion(promptId: string, currentVersionId: string) {
  const [updatedPrompt] = await db
    .update(prompts)
    .set({
      currentVersionId,
      updatedAt: new Date(),
    })
    .where(eq(prompts.id, promptId))
    .returning({
      id: prompts.id,
      title: prompts.title,
      type: prompts.type,
      tags: prompts.tags,
      currentVersionId: prompts.currentVersionId,
      createdAt: prompts.createdAt,
      updatedAt: prompts.updatedAt,
    });

  return updatedPrompt ?? null;
}
